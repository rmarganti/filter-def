# filter-def

A TypeScript library for defining and executing type-safe data filters. Define your filters once, get full type inference for filter inputs and results.

## Quick Start

```typescript
import { entity } from "filter-def";
import type { InputForFilterDef } from "filter-def";

interface User {
    name: string;
    email: string;
    age: number;
}

const filterUsers = entity<User>().filterDef({
    name: { kind: "equals", field: "name" },
    emailContains: { kind: "contains", field: "email" },
    olderThan: { kind: "gt", field: "age" },
});

type UserFilterInput = InputForFilterDef<typeof filterUsers>;

// Create a predicate function
const predicate = filterUsers({
    name: "John",
    emailContains: "@example.com",
    olderThan: 25,
});

// Use with native array methods
const filteredUsers = users.filter(predicate);
const firstMatch = users.find(predicate);
const hasMatch = users.some(predicate);
```

## Features

- **Type-safe filters**: Full TypeScript inference for filter inputs and entity fields
- **Composable**: Combine multiple filters with AND/OR logic
- **Simple API**: Define filters once, reuse everywhere
- **Native integration**: Returns predicates that work with `filter()`, `find()`, `some()`, and `every()`
- **Zero dependencies**: Lightweight and framework-agnostic

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

## Complete Example

```typescript
import { entity } from "filter-def";
import type { InputForFilterDef } from "filter-def";

interface Product {
    name: string;
    price: number;
    category: string;
    inStock: boolean;
    criticRating: number;
    userRating: number;
}

const filterProducts = entity<Product>().filterDef({
    // Primitive filters
    nameContains: { kind: "contains", field: "name" },
    inCategory: { kind: "inArray", field: "category" },
    inStock: { kind: "equals", field: "inStock" },

    // Boolean filter
    ratingAtLeast: {
        kind: "or",
        conditions: [
            { kind: "gte", field: "criticRating" },
            { kind: "gte", field: "userRating" },
        ],
    },
});

type ProductFilterInput = InputForFilterDef<typeof filterProducts>;

// Create a predicate with your filter criteria
const predicate = filterProducts({
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
