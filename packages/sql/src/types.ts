// Shared public types, re-exported by each dialect entry point.
export type { SqlFragment, SqlTag } from "./fragment.ts";
export type {
    SqlCustomFilter,
    SqlFilter,
    SqlFilterDef,
    SqlFilterInput,
    SqlFilterOptions,
} from "./sql-filter.ts";

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
