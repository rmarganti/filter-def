# @filter-def/core

Core types and utilities for the filter-def ecosystem.

## Overview

This package provides the shared type definitions and utilities used by filter-def adapters (`@filter-def/in-memory`, `@filter-def/drizzle`, etc.). It is a **types-only package** with no runtime code.

## Installation

```bash
pnpm add @filter-def/core
```

> **Note:** Most users should install an adapter package (`@filter-def/in-memory` or `@filter-def/drizzle`) which re-exports core types automatically.

## Types

### Filter Kinds

```typescript
import type {
    CoreFilterKind,
    PrimitiveFilterKind,
    BooleanFilterKind,
} from "@filter-def/core";

// PrimitiveFilterKind = "eq" | "neq" | "contains" | "inArray" | "isNull" | "isNotNull" | "gt" | "gte" | "lt" | "lte"
// BooleanFilterKind = "and" | "or"
// CoreFilterKind = PrimitiveFilterKind | BooleanFilterKind
```

### Core Filter Types

```typescript
import type {
    CoreFilter,
    PrimitiveFilter,
    BooleanFilter,
} from "@filter-def/core";

// CoreFilter<Entity> - Union of PrimitiveFilter and BooleanFilter
// PrimitiveFilter<Entity> - eq, neq, contains, inArray, gt, gte, lt, lte, isNull, isNotNull
// BooleanFilter<Entity> - and, or with conditions array
```

### Primitive Filter Types

```typescript
import type {
    EqFilter,
    NeqFilter,
    ContainsFilter,
    InArrayFilter,
    IsNullFilter,
    IsNotNullFilter,
    GTFilter,
    GTEFilter,
    LTFilter,
    LTEFilter,
} from "@filter-def/core";
```

### Boolean Filter Types

```typescript
import type { AndFilter, OrFilter } from "@filter-def/core";
```

### Input Type Utilities

```typescript
import type { CoreFilterInput } from "@filter-def/core";

// CoreFilterInput<K, Entity, TFilterField> - Extracts the input type for a core filter
```

### Validation

```typescript
import type { ValidateFilterDef } from "@filter-def/core";

// ValidateFilterDef<Entity, TFilterDef> - Compile-time validation for filter definitions
```

### Adapter Utilities

For adapter authors building custom filter-def backends:

```typescript
import type { GetFieldForFilter, Simplify, TypeError } from "@filter-def/core";

// GetFieldForFilter<K, Entity, TFilterField> - Determines which entity field a filter targets
// Simplify<T> - Forces TypeScript to display resolved types in intellisense
// TypeError<T> - Utility for meaningful compile-time error messages
```

## For Adapter Authors

If you're building a custom adapter for filter-def, import core types from this package and define adapter-specific types for filter definitions, custom filters, and input types:

```typescript
import type {
    CoreFilter,
    CoreFilterInput,
    PrimitiveFilter,
    BooleanFilter,
    Simplify,
    ValidateFilterDef,
} from "@filter-def/core";

// Define your adapter's custom filter type
type MyCustomFilter<Input> = (input: Input) => MyOutput;

// Define your adapter's filter field (core filters + custom)
type MyFilterField<Entity> =
    | PrimitiveFilter<Entity>
    | BooleanFilter<Entity>
    | MyCustomFilter<any>;

// Define your adapter's filter definition
type MyFilterDef<Entity> = Record<string, MyFilterField<Entity>>;

// Define your adapter's input extraction
type MyFilterDefInput<Entity, TFilterDef extends MyFilterDef<Entity>> = {
    [K in keyof TFilterDef]?: TFilterDef[K] extends MyCustomFilter<infer I>
        ? I
        : TFilterDef[K] extends CoreFilter<Entity>
          ? CoreFilterInput<K, Entity, TFilterDef[K]>
          : never;
};

// Create your adapter entry point
export const myAdapter = <Entity>() => {
    const def = <TFilterDef extends MyFilterDef<Entity>>(
        filtersDef: TFilterDef & ValidateFilterDef<Entity, TFilterDef>,
    ): MyFilter<Simplify<MyFilterDefInput<Entity, TFilterDef>>> => {
        // Implement filter compilation
    };

    return { def };
};
```

## Related Packages

- [`@filter-def/in-memory`](../memory) - In-memory filtering with native array methods
- [`@filter-def/drizzle`](../drizzle) - Drizzle ORM adapter for SQL databases
