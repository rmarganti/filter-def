---
"@filter-def/drizzle": major
"@filter-def/in-memory": major
---

Remove unused utility types and re-export core types

- drizzle: Remove `DrizzleFilterDefInput` export
- drizzle: Re-export all core types (`CoreFilter`, `CoreFilterDef`, `EqFilter`, etc.) for convenience
- in-memory: Remove `ExtractFilterKind`, `IsCustomFilter`, and `ExtractCustomFilterInput` utility types
- in-memory: Re-export all core types (`CoreFilter`, `CoreFilterDef`, `EqFilter`, etc.) for convenience
