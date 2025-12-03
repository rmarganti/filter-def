# Agent Guidelines for filter-def

## Project Structure

This is a **monorepo** with three packages:

- `@filter-def/core` - Core types and utilities (types-only package)
- `@filter-def/in-memory` - In-memory filtering with native array methods
- `@filter-def/drizzle` - Drizzle ORM adapter for SQL databases

Each package is located in `packages/{name}/` with its own `package.json`, tests, and examples.

## Build/Test Commands

- Build all: `pnpm run build`
- Build specific: `pnpm --filter @filter-def/in-memory run build`
- Test all: `pnpm test`
- Test specific package: `pnpm --filter @filter-def/in-memory test`
- Test single file: `pnpm --filter @filter-def/in-memory test src/in-memory-filter.spec.ts`
- Test pattern: `pnpm --filter @filter-def/in-memory test -- --run --reporter=verbose "*eq*"`
- Type check all: `pnpm run typecheck`
- Benchmarks: `pnpm run bench`

## Commit Guidelines

- Use conventional commits format (e.g., `feat:`, `fix:`, `chore:`, `docs:`)
- All commit messages must include a brief description of the change
- Semantic-release uses commit messages to determine version bumps

## Code Style Guidelines

### TypeScript Configuration

- Strict mode enabled with `noUnusedLocals: true`
- Target ESNext with ES2023 libraries
- ES modules with bundler resolution
- Declaration files generated

### Naming Conventions

- Interfaces: PascalCase (e.g., `FilterForEntity`, `EqFilterDef`)
- Types: PascalCase (e.g., `FilterFn`, `InputForFiltersDef`)
- Variables: camelCase (e.g., `filterDef`, `filterValue`, `entityShape`)
- Functions: camelCase (e.g., `filterFn`, `primitiveFilterPasses`)
- Type generics:
    - Use `T` prefix when the generic extends a type OR is being inferred (e.g., `TFilterDef extends FilterDef<Entity>`, `infer TEntity`)
    - Don't use `T` prefix when the generic is manually passed without constraints (e.g., `FilterDef<Entity>`, `CustomFilter<Entity, Input>`)

### Imports and Exports

- Named imports: `import { describe, expect, it } from "vitest"`
- Export types alongside implementations

### Type Definitions

- Use interfaces for object shapes with known structure
- Use type aliases for unions and complex types
- Include JSDoc comments for public interfaces
- Leverage conditional types for complex mappings

### Error Handling

- Use `satisfies never` for exhaustive switch statements
- Return early for undefined filter values
- Type assertions only when necessary

### Code Organization

- Group related types and interfaces together
- Separate logical sections with comments (e.g., `// ----------------------------------------------------------------`)
- Use arrow functions for functional programming patterns
- Prefer const over let, explicit types over inferred
- YAML (_.yaml, _.yml) files should use two-space tab widths.
  All other files (_.ts, _.md, \*.json, etc) should use four-space tab widths.
- `core` package exports types only, no runtime code
- `memory` and `drizzle` packages re-export core types for convenience

### Testing

- Use vitest with describe/it blocks
- Interface definitions for test data
- Descriptive test names and assertions
- Test edge cases and empty inputs

## General notes

- Do not create summary documents after making changes unless asked.
- Do not create a CHANGELOG.md file.
- Be extremely concise. Sacrifice grammar for the sake of concision.
