export { entity } from "./filter-def.ts";
export { makeFilterHelpers } from "./helpers.ts";
export type { FilterHelpers } from "./helpers.ts";

// Re-export core types for convenience
export type {
    AndFilter,
    BooleanFilter,
    CommonFilterOptions,
    ContainsFilter,
    CustomFilter,
    EqFilter,
    Filter,
    FilterDef,
    FilterDefInput,
    FilterField,
    FilterFieldInput,
    FilterInput,
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
    Simplify,
    TypeError,
    ValidateFilterDef,
} from "@filter-def/core";
