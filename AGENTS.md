# Agent Guidelines for filter-def

## Build/Test Commands

- Build: `pnpm run build`
- Test all: `pnpm test`
- Test single file: `pnpm test src/lib/filter-def.spec.ts`
- Test pattern: `pnpm test -- --run --reporter=verbose "*equals*"`
- Type check: `pnpm run typecheck`

## Code Style Guidelines

### TypeScript Configuration

- Strict mode enabled with `noUnusedLocals: true`
- Target ESNext with ES2023 libraries
- ES modules with bundler resolution
- Declaration files generated

### Naming Conventions

- Interfaces: PascalCase (e.g., `FilterForEntity`, `EqualsFilterDef`)
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

### Testing

- Use vitest with describe/it blocks
- Interface definitions for test data
- Descriptive test names and assertions
- Test edge cases and empty inputs</content>
  <parameter name="filePath">AGENTS.md
