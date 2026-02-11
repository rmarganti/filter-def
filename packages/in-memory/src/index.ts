export { makeFilterHelpers } from "./helpers.ts";
export type { FilterHelpers } from "./helpers.ts";
export { inMemoryFilter } from "./in-memory-filter.ts";
export type {
    InMemoryCustomFilter,
    InMemoryFilter,
    InMemoryFilterDef,
    InMemoryFilterInput,
} from "./in-memory-filter.ts";

// Re-export core types for convenience
export type {
    AndFilter,
    BooleanFilter,
    ContainsFilter,
    CoreFilter,
    CoreFilterDef,
    CoreFilterField,
    CoreFilterInput,
    CoreFilterKind,
    EqFilter,
    GTEFilter,
    GTFilter,
    InArrayFilter,
    IsNotNullFilter,
    IsNullFilter,
    LTEFilter,
    LTFilter,
    NeqFilter,
    OrFilter,
    PrimitiveFilter,
} from "@filter-def/core";
