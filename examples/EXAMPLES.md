# filter-def Examples

This directory contains comprehensive examples demonstrating the various features and use cases of the `filter-def` library.

## Running Examples

All examples can be run directly with Node.js:

```bash
node examples/basic-filtering.ts
node examples/nested-filters.ts
# ... etc
```

## Examples Overview

### 1. [basic-filtering.ts](./basic-filtering.ts)

**Start here!** Introduction to the library with simple filtering examples.

- Single field filtering
- **Multiple field filtering** (combined with AND logic)
- Price range filtering (multiple filters on same property)
- Text search with other criteria
- Using filters with native array methods (`filter`, `find`, `some`)

### 2. [boolean-filters.ts](./boolean-filters.ts)

Demonstrates AND/OR logic for complex conditional filtering.

- OR logic: searching across multiple fields
- Combining boolean filters with primitive filters
- **Multiple boolean filters together**
- AND logic for strict matching
- Real-world search scenarios

### 3. [array-helpers.ts](./array-helpers.ts)

Using the optional `makeFilterHelpers` utility functions.

- All helper functions: `filter`, `find`, `findIndex`, `some`, `every`
- **Filtering with multiple criteria** using helpers
- Comparing helpers vs predicates approach
- Nested array filtering
- Real-world project/task management scenario

### 4. [custom-filters.ts](./custom-filters.ts)

Advanced custom filter functions for complex business logic.

- Various custom filter implementations
- Date comparisons and ranges
- Engagement metrics and computed scores
- **Combining multiple custom filters**
- **Mixing custom and primitive filters** together
- Content recommendation system example

### 5. [nested-filters.ts](./nested-filters.ts)

Filtering parent entities based on nested child properties.

- Defining filters for related entities
- Using `some` helper to filter nested arrays
- Custom filters with nested logic
- User/Post relationship example

### 6. [e-commerce-search.ts](./e-commerce-search.ts)

Real-world e-commerce product filtering scenario.

- **Complex multi-field product search**
- Price ranges and categories
- Sale/discount filtering
- Text search across multiple fields
- Tag-based filtering
- Popularity and rating filters
- **Advanced search with 5+ simultaneous criteria**
- Analytics using filter results

### 7. [null-handling.ts](./null-handling.ts)

Working with nullable fields and data quality.

- `isNull` and `isNotNull` filter types
- **Checking multiple nullable fields**
- Combining null checks with other filters
- Data quality and completeness filtering
- Real-world contact management scenario
- Data cleanup recommendations

## Key Concepts Demonstrated

### Multiple Field Filtering

Most examples demonstrate filtering by multiple fields simultaneously. All top-level filters are combined with AND logic:

```typescript
const results = filterProducts(products, {
    category: "electronics", // AND
    inStock: true, // AND
    minRating: 4.0, // AND
    maxPrice: 200, // AND
});
```

### Combining Filter Types

You can mix different filter types together:

```typescript
const results = filterPosts(posts, {
    author: "Alice", // Primitive filter
    publishedWithinDays: 30, // Custom filter
    minEngagementRate: 0.1, // Custom filter
    hasTag: "tutorial", // Custom filter
});
```

### Predicates vs Helpers

The library supports two approaches:

**Predicates** (recommended for flexibility):

```typescript
const predicate = userFilter({ isActive: true });
const activeUsers = users.filter(predicate);
const firstActive = users.find(predicate);
```

**Helpers** (optional convenience):

```typescript
const { filter, find } = makeFilterHelpers(userFilter);
const activeUsers = filter(users, { isActive: true });
const firstActive = find(users, { isActive: true });
```

## Best Practices

1. **Start Simple**: Begin with `basic-filtering.ts` to understand core concepts
2. **Use Inferred Fields**: When filter names match entity properties, omit the `field` property
3. **Compose Filters**: Build complex filters by combining simple ones
4. **Type Safety**: Let TypeScript infer types - avoid manual type annotations when possible
5. **Custom Filters**: Use custom filters for business logic that doesn't fit primitive filters

## Related Documentation

- [Main README](../README.md) - Full API documentation
- [API Reference](../src/lib/filter-def.ts) - Implementation details
