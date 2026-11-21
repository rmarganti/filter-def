# @filter-def/sql

Type-safe filters that produce parameterized SQL for Postgres, MySQL, and BigQuery. Works with raw drivers like `pg`, `mysql2`, and `@google-cloud/bigquery`. No runtime dependencies.

## Installation

```bash
npm install @filter-def/sql
```

## Quick Start

Pick your database with the import path. Each path exports the same two things: `sqlFilter` to define filters, and a `sql` tag to build queries.

```typescript
import { sql, sqlFilter } from "@filter-def/sql/postgres";
// or "@filter-def/sql/mysql", "@filter-def/sql/bigquery"

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
}

const userFilter = sqlFilter<User>({
    columns: { isActive: "is_active" },
}).def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    minAge: { kind: "gte", field: "age" },
    isActive: { kind: "eq" },
});

const where = userFilter({ name: "John", minAge: 18 });

const query = sql`SELECT * FROM users WHERE org_id = ${orgId} AND ${where}`;
// {
//     text: 'SELECT * FROM users WHERE org_id = $1 AND ("name" = $2 AND "age" >= $3)',
//     values: [orgId, "John", 18],
// }

await pool.query(query);
```

A filter returns a SQL fragment, not a string. Put it inside the `sql` tag, which numbers every parameter in the final query. Your own values and the filter's values never clash.

## The `sql` tag

Interpolated filters and other `sql` results are inlined. Everything else becomes a bound parameter. The result is the object your driver expects:

| Import                     | Result              | Driver call                                    |
| -------------------------- | ------------------- | ---------------------------------------------- |
| `@filter-def/sql/postgres` | `{ text, values }`  | `pool.query(query)`                            |
| `@filter-def/sql/mysql`    | `{ sql, values }`   | `connection.execute(query)` or `.query(query)` |
| `@filter-def/sql/bigquery` | `{ query, params }` | `bigquery.query(query)`                        |

To get the SQL for a filter on its own:

```typescript
const { text, values } = sql`${userFilter({ name: "John" })}`;
```

When no filters apply, the filter returns `TRUE`, so `WHERE ${where}` is always valid.

## Column names

Field names are used exactly as written, and always quoted (`"name"` in Postgres, `` `name` `` in MySQL and BigQuery). Reserved words like `order` just work.

When a column name differs from the field name, list it in `columns`. This applies to every filter in the definition:

```typescript
sqlFilter<User>({ columns: { isActive: "is_active" } });
```

Dots in a column name are treated as qualifiers, which helps with joins:

```typescript
sqlFilter<User>({ columns: { name: "u.name" } }); // "u"."name"
```

### Postgres is case-sensitive with quoted names

Postgres matches quoted names exactly. If your TypeScript field is `isActive` and the column is `is_active` (or `isactive`), add it to `columns`. Otherwise the query fails with `column "isActive" does not exist`.

## Nested fields

- **BigQuery:** dotted paths map to STRUCT fields. `address.city` becomes `` `address`.`city` ``.
- **Postgres and MySQL:** dotted paths throw when you define the filter. Map them to a column with `columns`, or use a custom filter for JSON columns.

## Filter Types

| Kind                          | Postgres                  | MySQL                      | BigQuery                     |
| ----------------------------- | ------------------------- | -------------------------- | ---------------------------- |
| `eq`                          | `col = $1`                | `col = ?`                  | `col = @p0`                  |
| `neq`                         | `col <> $1`               | `col <> ?`                 | `col <> @p0`                 |
| `contains`                    | `col LIKE $1 ESCAPE '\'`  | `col LIKE ?`               | `col LIKE @p0`               |
| `contains`, `caseInsensitive` | `col ILIKE $1 ESCAPE '\'` | `LOWER(col) LIKE LOWER(?)` | `LOWER(col) LIKE LOWER(@p0)` |
| `inArray`                     | `col = ANY($1)`           | `col IN (?, ?, ?)`         | `col IN UNNEST(@p0)`         |
| `gt`, `gte`, `lt`, `lte`      | `col > $1`, etc.          | `col > ?`, etc.            | `col > @p0`, etc.            |
| `isNull`                      | `col IS NULL`             | `col IS NULL`              | `col IS NULL`                |
| `isNotNull`                   | `col IS NOT NULL`         | `col IS NOT NULL`          | `col IS NOT NULL`            |

Things to know:

- **`contains` escapes `%`, `_`, and `\`** in the input, so searching for `50%` matches the literal text.
- **An empty `inArray` list** produces `FALSE` and matches nothing.
- **`neq` follows SQL rules:** rows where the column is `NULL` don't match. This differs from `@filter-def/in-memory`.
- **MySQL `contains` is case-insensitive** with the default collation, even without `caseInsensitive`.
- **Values go to the driver unchanged.** Dates, booleans, and so on are handled by your driver.

## Boolean Filters

`and`/`or` conditions are grouped in parentheses:

```typescript
const userFilter = sqlFilter<User>().def({
    search: {
        kind: "or",
        conditions: [
            { kind: "contains", field: "name" },
            { kind: "contains", field: "email" },
        ],
    },
});

userFilter({ search: "john" });
// ("name" LIKE $1 ESCAPE '\' OR "email" LIKE $2 ESCAPE '\')
```

## Custom Filters

Return a fragment built with the same `sql` tag, or `undefined` to skip the filter. Custom SQL is always wrapped in parentheses, so an `OR` inside it can't leak into the rest of the query.

```typescript
const userFilter = sqlFilter<User>().def({
    ageDivisibleBy: (divisor: number) => sql`MOD(age, ${divisor}) = 0`,
    hasPostWithTitle: (title: string) =>
        sql`EXISTS (SELECT 1 FROM posts WHERE posts.author_id = users.id AND posts.title = ${title})`,
});
```

## Type Utilities

```typescript
import type { SqlFilterInput } from "@filter-def/sql/postgres";

type UserFilterInput = SqlFilterInput<typeof userFilter>;
// { name?: string; emailContains?: string; minAge?: number; isActive?: boolean }
```

## Related Packages

- [`@filter-def/core`](../core) - Core types and utilities
- [`@filter-def/in-memory`](../in-memory) - In-memory filtering with native array methods
- [`@filter-def/drizzle`](../drizzle) - Drizzle ORM adapter
