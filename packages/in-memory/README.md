# @filter-def/in-memory

In-memory filtering adapter for filter-def. Define type-safe filters once, get predicates that work with native array methods.

## Installation

```bash
npm install @filter-def/in-memory
# or
pnpm add @filter-def/in-memory
```

## Quick Start

```typescript
import { inMemoryFilter } from "@filter-def/in-memory";
import type { InMemoryFilterInput } from "@filter-def/in-memory";

interface User {
    name: string;
    email: string;
    age: number;
}

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
    olderThan: { kind: "gt", field: "age" },
});

// Create a predicate function
const predicate = userFilter({
    name: "John",
    emailContains: "@example.com",
    olderThan: 25,
});

// Use with native array methods
const users: User[] = [
    /* ... */
];
const filteredUsers = users.filter(predicate);
const firstUser = users.find(predicate);
const hasMatch = users.some(predicate);
```

## Features

- **Type-safe filters**: Full TypeScript inference for filter inputs and entity fields
- **Composable**: Combine multiple filters with AND/OR logic
- **Native integration**: Returns predicates for `filter()`, `find()`, `some()`, `every()`
- **Custom filters**: Define complex business logic with custom filter functions
- **Zero dependencies**: Lightweight and framework-agnostic (only depends on `@filter-def/core`)

## API

### `inMemoryFilter<Entity>()`

Creates a filter builder for the specified entity type.

```typescript
const productFilter = inMemoryFilter<Product>().def({
    // Filter definitions...
});
```

### `makeFilterHelpers(filter)`

Creates convenience wrapper functions around native array methods.

```typescript
import { inMemoryFilter, makeFilterHelpers } from "@filter-def/in-memory";

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    isActive: { kind: "eq" },
});

const {
    filter: filterUsers,
    find: findUser,
    findIndex: findUserIndex,
    some: someUsers,
    every: everyUser,
} = makeFilterHelpers(userFilter);

const activeUsers = filterUsers(users, { isActive: true });
const john = findUser(users, { name: "John" });
```

## Filter Types

### Primitive Filters

| Kind        | Description                 | Input Type     |
| ----------- | --------------------------- | -------------- |
| `eq`        | Exact equality match        | Field type     |
| `neq`       | Not equal                   | Field type     |
| `contains`  | String contains substring   | `string`       |
| `inArray`   | Value is in provided array  | `Field type[]` |
| `gt`        | Greater than                | Field type     |
| `gte`       | Greater than or equal       | Field type     |
| `lt`        | Less than                   | Field type     |
| `lte`       | Less than or equal          | Field type     |
| `isNull`    | Check if null/undefined     | `boolean`      |
| `isNotNull` | Check if not null/undefined | `boolean`      |

### Field Inference

When the filter name matches an entity field, the `field` property is inferred:

```typescript
const filter = inMemoryFilter<User>().def({
    name: { kind: "eq" }, // field: "name" inferred
    email: { kind: "contains" }, // field: "email" inferred
    olderThan: { kind: "gt", field: "age" }, // explicit field required
});
```

### Boolean Filters (AND/OR)

Combine conditions with logical operators. All conditions must have explicit `field` properties.

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
    priceRange: {
        kind: "and",
        conditions: [
            { kind: "gte", field: "price" },
            { kind: "lte", field: "price" },
        ],
    },
});
```

### Custom Filters

Define custom logic for complex filtering scenarios:

```typescript
interface BlogPost {
    tags: string[];
    publishedAt: Date;
    viewCount: number;
    likeCount: number;
}

const postFilter = inMemoryFilter<BlogPost>().def({
    // Check if post has a specific tag
    hasTag: (post, tag: string) => post.tags.includes(tag),

    // Check if published within X days
    publishedWithinDays: (post, days: number) => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return post.publishedAt >= cutoff;
    },

    // Calculate engagement rate
    minEngagementRate: (post, minRate: number) => {
        return post.likeCount / post.viewCount >= minRate;
    },
});

const trending = posts.filter(
    postFilter({
        publishedWithinDays: 7,
        minEngagementRate: 0.1,
        hasTag: "featured",
    }),
);
```

### Nested Filters

Filter parent entities based on child properties:

```typescript
interface User {
    name: string;
    posts: Post[];
}

interface Post {
    id: string;
    title: string;
}

const postFilter = inMemoryFilter<Post>().def({
    id: { kind: "eq" },
    titleContains: { kind: "contains", field: "title" },
});

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    wrotePostWithId: (user, postId: string) =>
        user.posts.some(postFilter({ id: postId })),
    hasPostWithTitle: (user, title: string) =>
        user.posts.some(postFilter({ titleContains: title })),
});

const authors = users.filter(userFilter({ hasPostWithTitle: "TypeScript" }));
```

## Type Utilities

### `InMemoryFilterInput<T>`

Extract the input type from a filter definition:

```typescript
import type { InMemoryFilterInput } from "@filter-def/in-memory";

const userFilter = inMemoryFilter<User>().def({
    name: { kind: "eq" },
    minAge: { kind: "gte", field: "age" },
});

type UserFilterInput = InMemoryFilterInput<typeof userFilter>;
// { name?: string; minAge?: number }
```

### `InMemoryFilter<Entity, Input>`

Type for the compiled filter function:

```typescript
import type { InMemoryFilter } from "@filter-def/in-memory";

// The filter is a function that takes input and returns a predicate
type UserFilter = InMemoryFilter<User, { name?: string }>;
// (filterInput?: { name?: string }) => (entity: User) => boolean
```

### `InMemoryCustomFilter<Entity, Input>`

Type for custom filter functions:

```typescript
import type { InMemoryCustomFilter } from "@filter-def/in-memory";

// Custom filters take (entity, input) and return boolean
type HasTagFilter = InMemoryCustomFilter<BlogPost, string>;
// (entity: BlogPost, input: string) => boolean
```

## Options

### Case-Insensitive Contains

```typescript
const filter = inMemoryFilter<User>().def({
    nameSearch: {
        kind: "contains",
        field: "name",
        caseInsensitive: true,
    },
});
```

## Examples

See the [examples directory](./examples) for comprehensive usage examples:

- [Basic filtering](./examples/basic-filtering.ts)
- [Boolean filters (AND/OR)](./examples/boolean-filters.ts)
- [Custom filters](./examples/custom-filters.ts)
- [Nested filters](./examples/nested-filters.ts)
- [Null handling](./examples/null-handling.ts)
- [E-commerce search](./examples/e-commerce-search.ts)
- [Array helpers](./examples/array-helpers.ts)

## Related Packages

- [`@filter-def/core`](../core) - Core types and utilities
- [`@filter-def/drizzle`](../drizzle) - Drizzle ORM adapter
- [`@filter-def/bigquery`](../bigquery) - BigQuery adapter
