# filter-def Multi-Adapter Expansion Plan

## Overview

Expand filter-def to support multiple data backends (in-memory, Drizzle+Postgres) while maintaining type-safe DX.

---

## Phase 1: Monorepo Setup

- [ ] Restructure to pnpm workspace with `packages/` directory
- [ ] Create package structure:
    - `packages/core` - shared types, validation, utilities
    - `packages/memory` - current in-memory implementation
    - `packages/drizzle` - Drizzle ORM adapter
- [ ] Update root `pnpm-workspace.yaml`
- [ ] Configure shared tooling (tsconfig, biome, prettier, vitest)
- [ ] Setup cross-package build order via `tsdown`

---

## Phase 2: Core Package (`@filter-def/core`)

### Types to Extract

- [ ] `FilterDef<Entity>` - filter definition shape
- [ ] `PrimitiveFilter` types (eq, neq, contains, inArray, gt, gte, lt, lte, isNull, isNotNull)
- [ ] `BooleanFilter` types (and, or)
- [ ] `CustomFilter<Entity, Input>` - keep but mark as adapter-specific
- [ ] `FilterInput<TFilter>` - input type extraction
- [ ] `ValidateFilterDef` - compile-time validation

### Utilities to Extract

- [ ] Field inference logic
- [ ] Filter kind constants/union types

### Core Package Exports

- [ ] All filter definition types
- [ ] Type utilities for adapter authors
- [ ] No runtime code initially (types-only package possible)

---

## Phase 3: Memory Package (`@filter-def/memory`)

- [ ] Move current implementation to `packages/memory`
- [ ] Import types from `@filter-def/core`
- [ ] Keep `entity<T>().filterDef()` API
- [ ] Keep `makeFilterHelpers()` helper
- [ ] Custom filters remain fully supported
- [ ] Re-export core types for convenience

---

## Phase 4: Drizzle Package (`@filter-def/drizzle`)

### API Design

```ts
// Schema-first approach
const userFilter = tableFilter(usersTable).filterDef({
    name: { kind: "eq" },
    emailContains: { kind: "contains", field: "email" },
});

// Usage
const where = userFilter({ name: "John" });
await db.select().from(usersTable).where(where);
```

### Filter Kind Mapping

| filter-def | Drizzle operator           |
| ---------- | -------------------------- |
| eq         | `eq()`                     |
| neq        | `ne()`                     |
| contains   | `like()` with `%val%`      |
| inArray    | `inArray()`                |
| gt         | `gt()`                     |
| gte        | `gte()`                    |
| lt         | `lt()`                     |
| lte        | `lte()`                    |
| isNull     | `isNull()` / `isNotNull()` |
| isNotNull  | `isNotNull()` / `isNull()` |
| and        | `and()`                    |
| or         | `or()`                     |

### Tasks

- [ ] Create `tableFilter(table)` entry point
- [ ] Infer entity type from Drizzle table schema (`InferSelectModel`)
- [ ] Map column references from table (not interface properties)
- [ ] Implement filter compilation to Drizzle `SQL` expressions
- [ ] Handle `contains` → `like('%value%')` conversion
- [ ] Return `SQL | undefined` for empty filters
- [ ] Handle boolean filters (and/or) composition

### Custom Filter Handling

- [ ] Custom filters return `SQL | undefined` expressions
- [ ] Enables EXISTS subqueries, raw SQL, complex conditions
- [ ] User responsible for SQL correctness

### Related Tables / Joins

The `tableFilter(usersTable)` API only references one table. Related table filtering is complex because:

- Filters generate WHERE clauses, not JOIN clauses
- Query builder requires explicit `.leftJoin()` / `.innerJoin()` calls
- Mismatch between filter and query structure causes runtime errors

**Recommended: EXISTS subquery pattern**

- [ ] Built-in filter kinds (`eq`, `contains`, etc.) work on base table only
- [ ] Custom filters return `SQL` expressions, enabling:
    - Subqueries: `exists(select().from(posts).where(...))`
    - Direct column refs if user ensures join exists (advanced, at-your-own-risk)
- [ ] Document pattern for related table filtering via `exists()` subqueries

**Example: Related table via EXISTS subquery**

```ts
const userFilter = tableFilter(usersTable).filterDef({
    name: { kind: "eq" },
    // Custom filter uses EXISTS subquery (no join required)
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

// Usage - no join needed
const where = userFilter({ hasPostWithTitle: "TypeScript" });
await db.select().from(usersTable).where(where);
```

**Future consideration (v2+):**

- [ ] Multi-table API with join metadata
- [ ] Helper to apply filter + required joins together

---

## Phase 5: Database Compatibility

### Universal Operators (no issues)

All Drizzle databases support these identically:

- `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- `inArray`, `isNull`, `isNotNull`
- `and`, `or`, `exists`
- `like` (case-sensitive)

### Database-Specific: Case-Insensitive Contains

| Database   | Native Support          | Workaround                       |
| ---------- | ----------------------- | -------------------------------- |
| PostgreSQL | `ILIKE` ✓               | —                                |
| MySQL      | `LIKE` is CI by default | Collation-dependent              |
| SQLite     | No `ILIKE`              | `lower(col) LIKE lower('%val%')` |

**Recommendation:**

- [ ] Default `contains` uses `like` (case-sensitive on PG, varies on MySQL/SQLite)
- [ ] Add `containsInsensitive` filter kind using portable `lower()` approach
- [ ] Optionally: `icontains` kind that uses `ilike` on PG, `lower()` elsewhere
- [ ] Document behavior differences in README

### Future Database-Specific Features

These would be Postgres-only filter kinds (or adapter-specific):

| Feature           | PostgreSQL    | MySQL           | SQLite |
| ----------------- | ------------- | --------------- | ------ |
| Array contains    | `@>` operator | N/A             | N/A    |
| JSON field access | `->`, `->>`   | `->`, `->>`     | JSON1  |
| Full-text search  | `@@` tsvector | `MATCH AGAINST` | N/A    |
| Array overlap     | `&&` operator | N/A             | N/A    |

**Decision:** Handle via custom filters initially. Add dedicated filter kinds only if demand warrants.

---

## Phase 6: Drizzle-Specific Features (Future)

- [ ] `between` filter kind
- [ ] `notInArray` filter kind
- [ ] `startsWith` / `endsWith` filter kinds
- [ ] `containsInsensitive` filter kind (portable)
- [ ] JSON column support (PG/MySQL)
- [ ] Array column support (Postgres)

---

## Phase 7: Documentation & Examples

- [ ] Update root README with monorepo structure
- [ ] Package-specific READMEs
- [ ] Migration guide from single-package
- [ ] Example: Shared filter types across memory + Drizzle
- [ ] Document database-specific behaviors

---

## Open Questions

1. **Package naming**: `@filter-def/core` vs `filter-def-core` vs scoped?
2. **Contains case sensitivity**: Default `like` or `ilike` for Drizzle?
3. **Empty filter behavior**: Return `undefined` or `` sql`1=1` ``?
4. **Backward compatibility**: Keep `filter-def` as alias for memory package?

---

## Package Dependencies

```
@filter-def/core
    ↑
    ├── @filter-def/memory (depends on core)
    └── @filter-def/drizzle (depends on core, drizzle-orm peer dep)
```

---

## Release Strategy

- [ ] Publish all packages under `@filter-def` scope
- [ ] `@filter-def/memory` v1.0 = current `filter-def` functionality
- [ ] `@filter-def/drizzle` v0.x until API stabilizes
- [ ] Deprecate `filter-def` package, point to `@filter-def/memory`
