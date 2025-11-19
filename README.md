# filter-def

A TypeScript library for defining and executing type-safe data filters. Define your filters once, get full type inference for filter inputs and results.

## Quick Start

```typescript
import { entity } from "filter-def";
import type { FilterInput } from "filter-def";

interface User {
    name: string;
    email: string;
    age: number;
}

const userFilter = entity<User>().filterDef({
    name: { kind: "equals" },
    emailContains: { kind: "contains", field: "email" },
    olderThan: { kind: "gt", field: "age" },
});

type UserFilterInput = FilterInput<typeof userFilter>;

// Create a predicate function
const predicate = userFilter({
    name: "John",
    emailContains: "@example.com",
    olderThan: 25,
});

// Use with native array methods
const filteredUsers = users.filter(predicate);
const firstUser = users.find(predicate);
const hasMatch = users.some(predicate);
```

## Features

- **Type-safe filters**: Full TypeScript inference for filter inputs and entity fields
- **Composable**: Combine multiple filters with AND/OR logic
- **Simple API**: Define filters once, reuse everywhere
- **Native integration**: Returns predicates that work with `filter()`, `find()`, `some()`, and `every()`
- **Zero dependencies**: Lightweight and framework-agnostic

## Inferred Field Names

When the filter name matches an entity field name, you can omit the `field` property and it will be automatically inferred:

```typescript
interface User {
    name: string;
    email: string;
    age: number;
}

const userFilter = entity<User>().filterDef({
    // Field is inferred from the key name
    name: { kind: "equals" }, // field: "name" is inferred
    email: { kind: "contains" }, // field: "email" is inferred
    age: { kind: "gte" }, // field: "age" is inferred

    // Explicit field when the filter name doesn't match
    olderThan: { kind: "gt", field: "age" },
    emailDomain: { kind: "contains", field: "email" },
});

const predicate = userFilter({
    name: "John", // filters User.name
    olderThan: 25, // filters User.age
});
```

This makes filter definitions more concise while maintaining full type safety. You can mix inferred and explicit fields in the same filter definition.

## Filter Types

### Primitive Filters

#### `equals`

Checks if a field value is referentially equal to the filter value.

```typescript
{ kind: "equals", field: "name" }
```

#### `contains`

Checks if the string representation of a field contains the filter value substring.

```typescript
{ kind: "contains", field: "email" }
```

#### `inArray`

Checks if a field value is contained within an array provided as the filter value.

```typescript
{ kind: "inArray", field: "status" }
// Input: ["active", "pending"]
```

#### `gt` (Greater Than)

Checks if a field value is greater than the filter value. Works with any comparable data type (numbers, strings, dates, etc.).

```typescript
{ kind: "gt", field: "age" }
// Input: 25
```

#### `gte` (Greater Than or Equal)

Checks if a field value is greater than or equal to the filter value. Works with any comparable data type (numbers, strings, dates, etc.).

```typescript
{ kind: "gte", field: "score" }
// Input: 100
```

#### `lt` (Less Than)

Checks if a field value is less than the filter value. Works with any comparable data type (numbers, strings, dates, etc.).

```typescript
{ kind: "lt", field: "price" }
// Input: 50
```

#### `lte` (Less Than or Equal)

Checks if a field value is less than or equal to the filter value. Works with any comparable data type (numbers, strings, dates, etc.).

```typescript
{ kind: "lte", field: "rating" }
// Input: 4.5
```

#### `isNull`

Checks if a field is null or undefined.

```typescript
{ kind: "isNull", field: "phone" }
// Input: true (to find null values) or false (to find non-null values)
```

#### `isNotNull`

Checks if a field is not null and not undefined.

```typescript
{ kind: "isNotNull", field: "phone" }
// Input: true (to find non-null values) or false (to find null values)
```

### Boolean Filters

Combine multiple primitive filters with logical operators.

#### `and`

All conditions must be true for the filter to pass.

```typescript
{
  kind: "and",
  conditions: [
    { kind: "equals", field: "status" },
    { kind: "gt", field: "age" }
  ]
}
```

#### `or`

At least one condition must be true for the filter to pass.

```typescript
{
  kind: "or",
  conditions: [
    { kind: "contains", field: "email" },
    { kind: "equals", field: "name" }
  ]
}
```

### Custom Filters

Define custom filter logic by providing a function instead of a filter definition object. Custom filters receive the entity and the input value, and return a boolean.

```typescript
interface User {
    name: string;
    email: string;
    posts: Array<Post>;
}

interface Post {
    id: string;
    title: string;
}

const userEntity = entity<User>();

const userFilter = userEntity.filterDef({
    name: { kind: "equals" },

    // Custom filter: check if user has written a specific number of posts
    postCount: (user: User, count: number) => {
        return user.posts.length === count;
    },

    // Custom filter: check if user has any posts
    hasPosts: (user: User, hasPosts: boolean) => {
        return hasPosts ? user.posts.length > 0 : user.posts.length === 0;
    },
});

const predicate = userFilter({
    postCount: 5,
    hasPosts: true,
});

const results = users.filter(predicate);
```

Custom filters provide full flexibility for complex filtering logic that doesn't fit into the standard filter types.

### Nested Filters

You can compose filters to work with nested arrays and related entities. This is especially useful when filtering parent entities based on child entity properties.

```typescript
interface User {
    name: string;
    email: string;
    posts: Array<Post>;
}

interface Post {
    id: string;
    title: string;
    content: string;
}

const userEntity = entity<User>();
const postEntity = entity<Post>();

// Define a filter for posts
const postFilter = postEntity.filterDef({
    id: { kind: "equals" },
    titleContains: { kind: "contains", field: "title" },
});

// Use the post filter within a user filter
const userFilter = userEntity.filterDef({
    name: { kind: "equals" },

    // Custom filter that uses the post filter on nested posts array
    wrotePostWithId: (user: User, postId: string) => {
        return user.posts.some(postFilter({ id: postId }));
    },

    // Custom filter to find users with posts matching criteria
    hasPostWithTitle: (user: User, titleFragment: string) => {
        return user.posts.some(postFilter({ titleContains: titleFragment }));
    },
});

// Find users who wrote post with ID "123"
const predicate1 = userFilter({ wrotePostWithId: "123" });
const results1 = users.filter(predicate1);

// Find users who have posts with "TypeScript" in the title
const predicate2 = userFilter({ hasPostWithTitle: "TypeScript" });
const results2 = users.filter(predicate2);
```

This pattern allows you to:

- Reuse filter definitions across different contexts
- Filter parent entities based on child entity properties
- Compose complex filtering logic from simpler filter definitions

## Complete Example

```typescript
import { entity } from "filter-def";
import type { FilterInput } from "filter-def";

interface Product {
    name: string;
    price: number;
    category: string;
    inStock: boolean;
    criticRating: number;
    userRating: number;
}

const productFilter = entity<Product>().filterDef({
    // Primitive filters with inferred fields
    name: { kind: "equals"}
    inStock: { kind: "equals" },

    // Primitive filter with explicit fields
    nameContains: { kind: "contains", field: "name" },
    inCategory: { kind: "inArray", field: "category" },

    // Boolean filter (conditions still require explicit fields)
    ratingAtLeast: {
        kind: "or",
        conditions: [
            { kind: "gte", field: "criticRating" },
            { kind: "gte", field: "userRating" },
        ],
    },
});

type ProductFilterInput = FilterInput<typeof productFilter>;

// Create a predicate with your filter criteria
const predicate = productFilter({
    nameContains: "phone",
    inCategory: ["electronics", "gadgets"],
    inStock: true,
    ratingAtLeast: 4.0,
});

// Use the predicate with native array methods
const results = products.filter(predicate);
const firstProduct = products.find(predicate);
const hasProducts = products.some(predicate);
```

## Notes

- `filterDef()` returns a predicate creator function
- Call the predicate creator with filter values to get a predicate function
- Use the predicate with native array methods: `filter()`, `find()`, `some()`, `every()`
- All filter inputs are optional
- Omitting a filter input automatically passes that filter
- Filters are combined with AND logic at the top level
- Boolean filters (and/or) work with primitive filters and their inputs
- Type inference works seamlessly with TypeScript strict mode
