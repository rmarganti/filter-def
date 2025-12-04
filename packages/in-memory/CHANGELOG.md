# @filter-def/in-memory

## 0.1.0

### Minor Changes

- 8445c2f: ### Monorepo Restructure

    Restructured filter-def as a pnpm monorepo with three packages:
    - `@filter-def/core` - Core types and utilities (types-only)
    - `@filter-def/in-memory` - In-memory filtering with native array methods
    - `@filter-def/drizzle` - Drizzle ORM adapter for SQL databases

    ### @filter-def/core

    New types-only package containing shared filter definition types:
    - `FilterDef<Entity>` and all primitive filter types (`eq`, `neq`, `contains`, `inArray`, `gt`, `gte`, `lt`, `lte`, `isNull`, `isNotNull`)
    - Boolean filter types (`and`, `or`)
    - `CustomFilter<Entity, Input>` for adapter-specific implementations
    - Type utilities for adapter authors (`ExtractFilterKind`, `GetFieldForFilter`, etc.)

    ### @filter-def/in-memory

    Existing in-memory filtering implementation, now as a standalone package:
    - `inMemoryFilter<T>().def()` API for defining filters
    - `makeFilterHelpers()` for convenient array filtering
    - Full custom filter support
    - Re-exports core types for convenience

    ### @filter-def/drizzle

    New Drizzle ORM adapter for SQL database filtering:
    - `drizzleFilter(table).def()` API matching the memory package pattern
    - Compiles filter definitions to Drizzle `SQL` expressions
    - Maps all primitive filters to Drizzle operators (`eq`, `ne`, `like`, `inArray`, `gt`, `gte`, `lt`, `lte`, `isNull`, `isNotNull`)
    - Boolean filter composition with `and()`/`or()`
    - Custom filters return `SQL | undefined` for EXISTS subqueries and complex conditions
    - `contains` filter uses case-insensitive `ilike` with `%value%` pattern

### Patch Changes

- Updated dependencies [8445c2f]
    - @filter-def/core@0.1.0
