# @filter-def/drizzle

Drizzle ORM adapter for filter-def. Define type-safe filters that compile to SQL WHERE clauses.

## Installation

```bash
npm install @filter-def/drizzle drizzle-orm
# or
pnpm add @filter-def/drizzle drizzle-orm
```

> **Note:** `drizzle-orm` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { drizzleFilter } from "@filter-def/drizzle";
import type { DrizzleFilterInput } from "@filter-def/drizzle";
import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

// Define your Drizzle table
const usersTable = pgTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    age: integer("age").notNull(),
    isActive: boolean("is_active").notNull(),
});

// Create a filter definition
const userFilter = drizzleFilter(usersTable).filterDef({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
    isActive: { kind: "eq" },
});

// Use in queries
const where = userFilter({
    name: "John",
    emailContains: "@example.com",
    minAge: 18,
    isActive: true,
});

const results = await db.select().from(usersTable).where(where);
```

## Features

- **Type-safe**: Filter inputs are inferred from your Drizzle table schema
- **SQL compilation**: Filters compile to efficient Drizzle SQL expressions
- **Composable**: Combine filters with AND/OR logic
- **Custom filters**: Write raw SQL for complex queries and subqueries
- **Returns `SQL | undefined`**: Empty filters return `undefined` for clean query composition

## API

### `drizzleFilter(table)`

Creates a filter builder for the specified Drizzle table.

```typescript
const productFilter = drizzleFilter(productsTable).filterDef({
    // Filter definitions...
});
```

### Filter Output

The filter function returns `SQL | undefined`:

```typescript
const where = userFilter({ name: "John" });
// where: SQL

const empty = userFilter({});
// empty: undefined

const noInput = userFilter();
// noInput: undefined
```

## Filter Types

### Primitive Filters

| Kind        | Drizzle Operator         | Description                      |
| ----------- | ------------------------ | -------------------------------- |
| `eq`        | `eq()`                   | Exact equality                   |
| `neq`       | `ne()`                   | Not equal                        |
| `contains`  | `like('%value%')`        | String contains (case-sensitive) |
| `inArray`   | `inArray()`              | Value in array                   |
| `gt`        | `gt()`                   | Greater than                     |
| `gte`       | `gte()`                  | Greater than or equal            |
| `lt`        | `lt()`                   | Less than                        |
| `lte`       | `lte()`                  | Less than or equal               |
| `isNull`    | `isNull()`/`isNotNull()` | Check null                       |
| `isNotNull` | `isNotNull()`/`isNull()` | Check not null                   |

### Field Inference

When the filter name matches a column name, the `field` property is inferred:

```typescript
const filter = drizzleFilter(usersTable).filterDef({
    name: { kind: "eq" }, // field: "name" inferred
    email: { kind: "contains" }, // field: "email" inferred
    minAge: { kind: "gte", field: "age" }, // explicit field required
});
```

### Case-Insensitive Contains

Use `caseInsensitive: true` to use `ILIKE` instead of `LIKE`:

```typescript
const filter = drizzleFilter(usersTable).filterDef({
    nameSearch: {
        kind: "contains",
        field: "name",
        caseInsensitive: true, // Uses ilike('%value%')
    },
});
```

### Boolean Filters (AND/OR)

Combine conditions with logical operators. All conditions must have explicit `field` properties.

```typescript
const filter = drizzleFilter(usersTable).filterDef({
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
    searchTerm: "john", // name LIKE '%john%' OR email LIKE '%john%'
    ageRange: 30, // age >= 30 AND age <= 30
});
```

### Custom Filters

Custom filters receive the input value and return a Drizzle `SQL` expression:

```typescript
import { sql, eq, exists } from "drizzle-orm";

const userFilter = drizzleFilter(usersTable).filterDef({
    // Raw SQL expression
    ageDivisibleBy: (divisor: number) =>
        sql`${usersTable.age} % ${divisor} = 0`,

    // Return undefined to skip filter
    optionalStatus: (status: string | "all") =>
        status === "all" ? undefined : eq(usersTable.status, status),

    // EXISTS subquery for related tables
    hasPostWithTitle: (title: string) =>
        exists(
            db
                .select()
                .from(postsTable)
                .where(
                    and(
                        eq(postsTable.authorId, usersTable.id),
                        ilike(postsTable.title, `%${title}%`),
                    ),
                ),
        ),
});
```

## Related Tables / Joins

The drizzle adapter generates WHERE clauses, not JOIN clauses. For filtering by related table data, use **EXISTS subqueries** via custom filters:

```typescript
import { exists, and, eq, ilike } from "drizzle-orm";

const usersTable = pgTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
});

const postsTable = pgTable("posts", {
    id: integer("id").primaryKey(),
    authorId: integer("author_id").notNull(),
    title: text("title").notNull(),
});

const userFilter = drizzleFilter(usersTable).filterDef({
    name: { kind: "eq" },

    // Custom filter with EXISTS subquery
    hasPostWithTitle: (title: string) =>
        exists(
            db
                .select()
                .from(postsTable)
                .where(
                    and(
                        eq(postsTable.authorId, usersTable.id),
                        ilike(postsTable.title, `%${title}%`),
                    ),
                ),
        ),
});

// No join needed - EXISTS handles the relationship
const where = userFilter({ hasPostWithTitle: "TypeScript" });
const authors = await db.select().from(usersTable).where(where);
```

## Type Utilities

### `DrizzleFilterInput<T>`

Extract the input type from a filter definition:

```typescript
import type { DrizzleFilterInput } from "@filter-def/drizzle";

const userFilter = drizzleFilter(usersTable).filterDef({
    name: { kind: "eq" },
    minAge: { kind: "gte", field: "age" },
});

type UserFilterInput = DrizzleFilterInput<typeof userFilter>;
// { name?: string; minAge?: number }
```

### `DrizzleFilter<TFilterInput>`

Type for the compiled filter function:

```typescript
import type { DrizzleFilter } from "@filter-def/drizzle";

// The filter is a function that takes input and returns SQL | undefined
type UserFilter = DrizzleFilter<{ name?: string }>;
// (filterInput?: { name?: string }) => SQL | undefined
```

### `DrizzleCustomFilter<Input>`

Type for custom filter functions:

```typescript
import type { DrizzleCustomFilter } from "@filter-def/drizzle";

// Custom filters take input and return SQL | undefined
type DivisibleByFilter = DrizzleCustomFilter<number>;
// (input: number) => SQL | undefined
```

## Complete Example

```typescript
import { drizzleFilter } from "@filter-def/drizzle";
import type { DrizzleFilterInput } from "@filter-def/drizzle";
import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";

// Table definition
const productsTable = pgTable("products", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    category: text("category").notNull(),
    inStock: boolean("in_stock").notNull(),
    createdAt: timestamp("created_at").notNull(),
});

// Filter definition
const productFilter = drizzleFilter(productsTable).filterDef({
    // Inferred fields
    name: { kind: "eq" },
    category: { kind: "eq" },
    inStock: { kind: "eq" },

    // Explicit fields
    nameContains: { kind: "contains", field: "name", caseInsensitive: true },
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
});

type ProductFilterInput = DrizzleFilterInput<typeof productFilter>;

// Usage
async function searchProducts(
    db: ReturnType<typeof drizzle>,
    input: ProductFilterInput,
) {
    const where = productFilter(input);
    return db.select().from(productsTable).where(where);
}

// Example queries
const electronics = await searchProducts(db, {
    category: "electronics",
    inStock: true,
    maxPrice: 500,
});

const searchResults = await searchProducts(db, {
    search: "laptop",
    minPrice: 200,
    maxPrice: 1000,
});
```

## Database-Specific Behaviors

### PostgreSQL

- `contains` uses `LIKE` (case-sensitive) by default
- `contains` with `caseInsensitive: true` uses `ILIKE`
- All Drizzle PostgreSQL operators are supported

### MySQL / SQLite

- `contains` uses `LIKE` which is case-insensitive by default in MySQL
- `caseInsensitive` option may behave differently depending on collation

## Related Packages

- [`@filter-def/core`](../core) - Core types and utilities
- [`@filter-def/memory`](../memory) - In-memory filtering with native array methods
