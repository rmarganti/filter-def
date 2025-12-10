# @filter-def/bigquery

BigQuery adapter for filter-def. Define type-safe filters that compile to parameterized SQL for use with `@google-cloud/bigquery`.

## Installation

```bash
npm install @filter-def/bigquery @google-cloud/bigquery
# or
pnpm add @filter-def/bigquery @google-cloud/bigquery
```

> **Note:** `@google-cloud/bigquery` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { bigqueryFilter } from "@filter-def/bigquery";
import type { BigQueryFilterInput } from "@filter-def/bigquery";
import { BigQuery } from "@google-cloud/bigquery";

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
}

// Create a filter definition
const userFilter = bigqueryFilter<User>("myproject.dataset.users").def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
    isActive: { kind: "eq" },
});

// Generate SQL and params
const where = userFilter({
    name: "John",
    emailContains: "@example.com",
    minAge: 18,
    isActive: true,
});

// Use with BigQuery
const bigquery = new BigQuery();
const [rows] = await bigquery.query({
    query: `SELECT * FROM \`myproject.dataset.users\` WHERE ${where.sql}`,
    params: where.params,
});
```

## Features

- **Type-safe**: Filter inputs are inferred from your entity type
- **Parameterized queries**: Generates safe SQL with `@paramName` placeholders
- **Composable**: Combine filters with AND/OR logic
- **Custom filters**: Write raw SQL for complex queries
- **Always returns `{ sql, params }`**: Empty filters return `{ sql: "true", params: {} }` for seamless query composition

## API

### `bigqueryFilter<Entity>()`

Creates a filter builder for the specified entity type.

```typescript
const productFilter = bigqueryFilter<Product>("project.dataset.products").def({
    // Filter definitions...
});
```

### Filter Output

The filter function always returns `BigQueryFilterResult`:

```typescript
const where = userFilter({ name: "John" });
// where: { sql: 'name = @name', params: { name: 'John' } }

const empty = userFilter({});
// empty: { sql: 'true', params: {} }

const noInput = userFilter();
// noInput: { sql: 'true', params: {} }
```

## Filter Types

### Primitive Filters

| Kind        | SQL Output                 | Description                      |
| ----------- | -------------------------- | -------------------------------- |
| `eq`        | `column = @param`          | Exact equality                   |
| `neq`       | `column != @param`         | Not equal                        |
| `contains`  | `column LIKE @param`       | String contains (case-sensitive) |
| `inArray`   | `column IN UNNEST(@param)` | Value in array                   |
| `gt`        | `column > @param`          | Greater than                     |
| `gte`       | `column >= @param`         | Greater than or equal            |
| `lt`        | `column < @param`          | Less than                        |
| `lte`       | `column <= @param`         | Less than or equal               |
| `isNull`    | `column IS NULL`           | Check null (no param)            |
| `isNotNull` | `column IS NOT NULL`       | Check not null (no param)        |

### Field Inference

When the filter name matches a column name, the `field` property is inferred:

```typescript
const filter = bigqueryFilter<User>("dataset.users").def({
    name: { kind: "eq" }, // field: "name" inferred
    email: { kind: "contains" }, // field: "email" inferred
    minAge: { kind: "gte", field: "age" }, // explicit field required
});
```

### Case-Insensitive Contains

Use `caseInsensitive: true` to use `LOWER()` for case-insensitive matching:

```typescript
const filter = bigqueryFilter<User>("dataset.users").def({
    nameSearch: {
        kind: "contains",
        field: "name",
        caseInsensitive: true, // Uses LOWER(column) LIKE LOWER(@param)
    },
});
```

### Boolean Filters (AND/OR)

Combine conditions with logical operators. All conditions must have explicit `field` properties.

```typescript
const filter = bigqueryFilter<User>("dataset.users").def({
    // OR: match any condition
    searchTerm: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "name" },
            { kind: "contains", field: "email" },
        ],
    },

    // AND: match all conditions
    ageRange: {
        kind: "and",
        conditions: [
            { kind: "gte", field: "age" },
            { kind: "lte", field: "age" },
        ],
    },
});

const where = userFilter({
    searchTerm: "john", // (name LIKE @searchTerm_0 OR email LIKE @searchTerm_1)
    ageRange: 30, // (age >= @ageRange_0 AND age <= @ageRange_1)
});
```

### Custom Filters

Custom filters receive the input value and return a `BigQueryFilterResult`:

```typescript
import type { BigQueryFilterResult } from "@filter-def/bigquery";

const userFilter = bigqueryFilter<User>("dataset.users").def({
    // Custom SQL expression
    ageDivisibleBy: (divisor: number): BigQueryFilterResult => ({
        sql: "MOD(age, @divisor) = 0",
        params: { divisor },
    }),

    // Return 'true' condition when no filter needed
    optionalStatus: (status: string | "all"): BigQueryFilterResult =>
        status === "all"
            ? { sql: "true", params: {} }
            : { sql: "status = @status", params: { status } },

    // Complex date filtering
    createdAfter: (date: Date): BigQueryFilterResult => ({
        sql: "created_at > @createdAfter",
        params: { createdAfter: date.toISOString() },
    }),
});
```

## Type Utilities

### `BigQueryFilterInput<T>`

Extract the input type from a filter definition:

```typescript
import type { BigQueryFilterInput } from "@filter-def/bigquery";

const userFilter = bigqueryFilter<User>("dataset.users").def({
    name: { kind: "eq" },
    minAge: { kind: "gte", field: "age" },
});

type UserFilterInput = BigQueryFilterInput<typeof userFilter>;
// { name?: string; minAge?: number }
```

### `BigQueryFilter<TFilterInput>`

Type for the compiled filter function:

```typescript
import type { BigQueryFilter } from "@filter-def/bigquery";

type UserFilter = BigQueryFilter<{ name?: string }>;
// (filterInput?: { name?: string }) => BigQueryFilterResult
```

### `BigQueryFilterResult`

Type for the filter output:

```typescript
import type { BigQueryFilterResult } from "@filter-def/bigquery";

// { sql: string; params: Record<string, unknown> }
```

### `BigQueryCustomFilter<Input>`

Type for custom filter functions:

```typescript
import type { BigQueryCustomFilter } from "@filter-def/bigquery";

// Custom filters take input and return BigQueryFilterResult
type DivisibleByFilter = BigQueryCustomFilter<number>;
// (input: number) => BigQueryFilterResult
```

## Complete Example

```typescript
import { bigqueryFilter } from "@filter-def/bigquery";
import type { BigQueryFilterInput } from "@filter-def/bigquery";
import { BigQuery } from "@google-cloud/bigquery";

// Entity type
interface Product {
    id: number;
    name: string;
    description: string | null;
    price: number;
    category: string;
    inStock: boolean;
    createdAt: string;
}

// Filter definition
const productFilter = bigqueryFilter<Product>("myproject.dataset.products").def(
    {
        // Inferred fields
        name: { kind: "eq" },
        category: { kind: "eq" },
        inStock: { kind: "eq" },

        // Explicit fields
        nameContains: {
            kind: "contains",
            field: "name",
            caseInsensitive: true,
        },
        minPrice: { kind: "gte", field: "price" },
        maxPrice: { kind: "lte", field: "price" },
        inCategories: { kind: "inArray", field: "category" },

        // Boolean filter for search
        search: {
            kind: "or",
            conditions: [
                { kind: "contains", field: "name" },
                { kind: "contains", field: "description" },
            ],
        },
    },
);

type ProductFilterInput = BigQueryFilterInput<typeof productFilter>;

// Usage
async function searchProducts(
    bigquery: BigQuery,
    input: ProductFilterInput,
): Promise<Product[]> {
    const where = productFilter(input);

    // Empty filters return { sql: 'true', params: {} }, which matches all rows
    const [rows] = await bigquery.query({
        query: `SELECT * FROM \`myproject.dataset.products\` WHERE ${where.sql}`,
        params: where.params,
    });
    return rows as Product[];
}

// Example queries
const electronics = await searchProducts(bigquery, {
    category: "electronics",
    inStock: true,
    maxPrice: 500,
});

const searchResults = await searchProducts(bigquery, {
    search: "laptop",
    minPrice: 200,
    maxPrice: 1000,
});
```

## BigQuery-Specific Notes

### Array Parameters

BigQuery uses `UNNEST()` for array parameters in `IN` clauses:

```typescript
const filter = bigqueryFilter<User>("dataset.users").def({
    ageIn: { kind: "inArray", field: "age" },
});

const where = filter({ ageIn: [25, 30, 35] });
// sql: 'age IN UNNEST(@ageIn)'
// params: { ageIn: [25, 30, 35] }
```

### Timestamp Handling

BigQuery expects timestamps in ISO format. Use custom filters for date handling:

```typescript
const filter = bigqueryFilter<Event>("dataset.events").def({
    after: (date: Date) => ({
        sql: "timestamp > @after",
        params: { after: date.toISOString() },
    }),
});
```

### NULL Handling

`isNull` and `isNotNull` filters don't use parameters:

```typescript
const where = filter({ phoneIsNull: true });
// sql: 'phone IS NULL'
// params: {}
```

### Empty Filters and `WHERE true`

When no filters are provided or all filter values are `undefined`, the filter returns:

```typescript
{ sql: "true", params: {} }
```

This is valid BigQuery SQL that matches all rows, simplifying query composition:

```typescript
// No need for conditional logic
const where = userFilter({});
const [rows] = await bigquery.query({
    query: `SELECT * FROM \`table\` WHERE ${where.sql}`, // WHERE true
    params: where.params,
});
```

## Related Packages

- [`@filter-def/core`](../core) - Core types and utilities
- [`@filter-def/in-memory`](../in-memory) - In-memory filtering with native array methods
- [`@filter-def/drizzle`](../drizzle) - Drizzle ORM adapter
