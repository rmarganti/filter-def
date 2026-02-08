# filter-def

A TypeScript library for defining type-safe data filters. Define your filters once, use them across different data backends.

## Packages

This is a monorepo containing the following packages:

| Package                                         | Description                                   | NPM                                                                                                               |
| ----------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`@filter-def/core`](./packages/core)           | Core types and utilities                      | [![npm](https://img.shields.io/npm/v/@filter-def/core)](https://www.npmjs.com/package/@filter-def/core)           |
| [`@filter-def/in-memory`](./packages/in-memory) | In-memory filtering with native array methods | [![npm](https://img.shields.io/npm/v/@filter-def/in-memory)](https://www.npmjs.com/package/@filter-def/in-memory) |
| [`@filter-def/drizzle`](./packages/drizzle)     | Drizzle ORM adapter for SQL databases         | [![npm](https://img.shields.io/npm/v/@filter-def/drizzle)](https://www.npmjs.com/package/@filter-def/drizzle)     |
| [`@filter-def/bigquery`](./packages/bigquery)   | BigQuery adapter for parameterized SQL        | [![npm](https://img.shields.io/npm/v/@filter-def/bigquery)](https://www.npmjs.com/package/@filter-def/bigquery)   |

## Features

- **Type-safe filters**: Full TypeScript inference for filter inputs and entity fields
- **Multiple backends**: Use the same filter patterns for in-memory arrays or SQL databases
- **Composable**: Combine filters with AND/OR logic
- **Custom filters**: Define complex business logic with custom filter functions
- **Nested fields**: Filter on deeply nested object properties with dot-separated paths
- **Zero lock-in**: Each adapter works independently

## Quick Start

### In-Memory Filtering

```typescript
import { inMemoryFilter } from "@filter-def/in-memory";

interface User {
    name: string;
    email: string;
    age: number;
}

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
});

// Create predicates for native array methods
const users: User[] = [
    /* ... */
];
const results = users.filter(
    userFilter({
        name: "John",
        emailContains: "@example.com",
        minAge: 18,
    }),
);
```

### Drizzle ORM

```typescript
import { drizzleFilter } from "@filter-def/drizzle";
import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

const usersTable = pgTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    age: integer("age").notNull(),
});

const userFilter = drizzleFilter(usersTable).def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
});

// Create SQL WHERE clauses
const where = userFilter({
    name: "John",
    emailContains: "@example.com",
    minAge: 18,
});

const results = await db.select().from(usersTable).where(where);
```

### BigQuery

```typescript
import { bigqueryFilter } from "@filter-def/bigquery";
import { BigQuery } from "@google-cloud/bigquery";

const userFilter = bigqueryFilter<User>("myproject.dataset.users").def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
});

// Create parameterized SQL
const where = userFilter({
    name: "John",
    emailContains: "@example.com",
    minAge: 18,
});

const bigquery = new BigQuery();
const [rows] = await bigquery.query({
    query: `SELECT * FROM \`myproject.dataset.users\` WHERE ${where.sql}`,
    params: where.params,
});
```

## Filter Types

All adapters support the same core filter types:

### Primitive Filters

| Kind        | Description                 | Input Type     |
| ----------- | --------------------------- | -------------- |
| `eq`        | Exact equality              | Field type     |
| `neq`       | Not equal                   | Field type     |
| `contains`  | String contains substring   | `string`       |
| `inArray`   | Value is in array           | `Field type[]` |
| `gt`        | Greater than                | Field type     |
| `gte`       | Greater than or equal       | Field type     |
| `lt`        | Less than                   | Field type     |
| `lte`       | Less than or equal          | Field type     |
| `isNull`    | Check if null/undefined     | `boolean`      |
| `isNotNull` | Check if not null/undefined | `boolean`      |

### Boolean Filters

Combine conditions with AND/OR logic:

```typescript
const filter = inMemoryFilter<User>().def({
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
```

### Custom Filters

Each adapter supports custom filters with adapter-specific implementations:

**Memory** (predicate function):

```typescript
const filter = inMemoryFilter<User>().def({
    hasRole: (user, role: string) => user.roles.includes(role),
});
```

**Drizzle** (SQL expression):

```typescript
const filter = drizzleFilter(usersTable).def({
    ageDivisibleBy: (divisor: number) =>
        sql`${usersTable.age} % ${divisor} = 0`,
});
```

**BigQuery** (parameterized SQL):

```typescript
const filter = bigqueryFilter<User>("dataset.users").def({
    ageDivisibleBy: (divisor: number) => ({
        sql: "MOD(age, @divisor) = 0",
        params: { divisor },
    }),
});
```

## Field Inference

When the filter name matches a field/column name, the `field` property is optional:

```typescript
const filter = inMemoryFilter<User>().def({
    name: { kind: "eq" }, // field: "name" inferred
    email: { kind: "contains" }, // field: "email" inferred
    minAge: { kind: "gte", field: "age" }, // explicit field required
});
```

### Nested Fields

Use dot-separated paths to filter on nested object properties:

```typescript
interface Employee {
    name: { first: string; last: string };
    address: { city: string; geo: { lat: number; lng: number } };
}

const employeeFilter = inMemoryFilter<Employee>().def({
    firstName: { kind: "eq", field: "name.first" },
    city: { kind: "contains", field: "address.city" },
    minLat: { kind: "gte", field: "address.geo.lat" },
});
```

Nested fields are supported by `@filter-def/in-memory` and `@filter-def/bigquery`. `@filter-def/drizzle` does not support nested fields and will throw an error, since Drizzle operates on flat table columns.

## Type Utilities

Extract the input type from any filter definition:

```typescript
import type { InMemoryFilterInput } from "@filter-def/in-memory";
// or
import type { DrizzleFilterInput } from "@filter-def/drizzle";
// or
import type { BigQueryFilterInput } from "@filter-def/bigquery";

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    minAge: { kind: "gte", field: "age" },
});

type UserFilterInput = InMemoryFilterInput<typeof userFilter>;
// { name?: string; minAge?: number }
```

## Installation

```bash
# For in-memory filtering
npm install @filter-def/in-memory

# For Drizzle ORM
npm install @filter-def/drizzle drizzle-orm

# For BigQuery
npm install @filter-def/bigquery @google-cloud/bigquery
```

## Documentation

- [`@filter-def/in-memory` README](./packages/in-memory/README.md) - Full API docs and examples
- [`@filter-def/drizzle` README](./packages/drizzle/README.md) - Full API docs and examples
- [`@filter-def/bigquery` README](./packages/bigquery/README.md) - Full API docs and examples
- [`@filter-def/core` README](./packages/core/README.md) - Core types for adapter authors

## License

MIT
