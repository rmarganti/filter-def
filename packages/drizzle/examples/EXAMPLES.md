# @filter-def/drizzle Examples

This directory contains comprehensive examples demonstrating the various features and use cases of the `@filter-def/drizzle` package.

## Running Examples

These examples are designed to illustrate usage patterns. To run them, you'll need:

1. A PostgreSQL database (or PGlite for local testing)
2. Drizzle ORM configured with your database

```bash
# Install dependencies
pnpm install

# Run example (requires database setup)
npx tsx examples/basic-filtering.ts
```

## Examples Overview

### 1. [basic-filtering.ts](./basic-filtering.ts)

**Start here!** Introduction to the library with simple filtering examples.

- Single field filtering with `eq`, `contains`, `gte`, `lte`
- **Multiple field filtering** (combined with AND logic)
- Price range filtering (multiple filters on same column)
- Using filters with Drizzle's `where()` method

### 2. [boolean-filters.ts](./boolean-filters.ts)

Demonstrates AND/OR logic for complex conditional filtering.

- OR logic: searching across multiple columns
- Combining boolean filters with primitive filters
- **Multiple boolean filters together**
- AND logic for strict matching
- Real-world search scenarios

### 3. [custom-filters.ts](./custom-filters.ts)

Advanced custom SQL filters for complex business logic.

- Raw SQL expressions with `sql` template
- Date comparisons and ranges
- Conditional filter application (returning `undefined`)
- **Combining multiple custom filters**
- **Mixing custom and primitive filters** together

### 4. [related-tables.ts](./related-tables.ts)

Filtering by related table data using EXISTS subqueries.

- EXISTS subquery pattern for related tables
- Custom filters that reference multiple tables
- User/Post relationship filtering
- Avoiding JOIN complexity with subqueries

### 5. [null-handling.ts](./null-handling.ts)

Working with nullable columns and data quality filtering.

- `isNull` and `isNotNull` filter types
- **Checking multiple nullable columns**
- Combining null checks with other filters
- Data completeness queries

## Key Concepts Demonstrated

### Multiple Field Filtering

All top-level filters are combined with AND logic:

```typescript
const where = productFilter({
    category: "electronics", // AND
    inStock: true, // AND
    minPrice: 100, // AND
    maxPrice: 500, // AND
});

await db.select().from(productsTable).where(where);
```

### Filter Output Types

Filters return `SQL | undefined`:

```typescript
const where = userFilter({ name: "John" }); // SQL
const empty = userFilter({}); // undefined
const noInput = userFilter(); // undefined
```

### Custom SQL Filters

Custom filters receive input and return `SQL | undefined`:

```typescript
const filter = drizzleFilter(table).def({
    // Return SQL expression
    ageDivisibleBy: (divisor: number) => sql`${table.age} % ${divisor} = 0`,

    // Return undefined to skip filter
    optionalStatus: (status: string | "all") =>
        status === "all" ? undefined : eq(table.status, status),
});
```

### EXISTS Subqueries for Related Tables

Since filters generate WHERE clauses (not JOINs), use EXISTS for related data:

```typescript
const userFilter = drizzleFilter(usersTable).def({
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

## Comparison with @filter-def/in-memory

| Feature          | Memory                       | Drizzle                       |
| ---------------- | ---------------------------- | ----------------------------- |
| Input            | Entity interface             | Drizzle table                 |
| Output           | Predicate function           | SQL expression                |
| Custom filters   | `(entity, input) => boolean` | `(input) => SQL \| undefined` |
| Related data     | Nested array methods         | EXISTS subqueries             |
| Case-insensitive | `caseInsensitive` option     | `caseInsensitive` → `ILIKE`   |

## Best Practices

1. **Start Simple**: Begin with `basic-filtering.ts` to understand core concepts
2. **Use Inferred Fields**: When filter names match column names, omit the `field` property
3. **EXISTS for Relations**: Use EXISTS subqueries instead of trying to generate JOINs
4. **Handle Empty Filters**: Check for `undefined` when composing with other conditions
5. **Type Safety**: Let TypeScript infer types from your Drizzle table schema

## Related Documentation

- [Package README](../README.md) - Full API documentation
- [Memory Package Examples](../../memory/examples/EXAMPLES.md) - In-memory filtering examples
- [Core Package](../../core/README.md) - Shared types documentation
