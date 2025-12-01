export { makeFilterHelpers } from "./helpers.ts";
export type { FilterHelpers } from "./helpers.ts";
export { inMemoryFilter } from "./in-memory-filter.ts";

// Filter definition types
export type {
    Filter,
    FilterDef,
    FilterDefInput,
    FilterField,
    FilterFieldInput,
    FilterInput,
} from "@filter-def/core";

// Primitive filters
export type {
    CommonFilterOptions,
    ContainsFilter,
    EqFilter,
    GTEFilter,
    GTFilter,
    InArrayFilter,
    IsNotNullFilter,
    IsNullFilter,
    LTEFilter,
    LTFilter,
    NeqFilter,
    PrimitiveFilter,
} from "@filter-def/core";

// Boolean filters
export type { AndFilter, BooleanFilter, OrFilter } from "@filter-def/core";

// Custom filters
export type { CustomFilter } from "@filter-def/core";

// Filter kind types
export type {
    BooleanFilterKind,
    FilterKind,
    PrimitiveFilterKind,
} from "@filter-def/core";

// Adapter utilities
export type {
    ExtractCustomFilterInput,
    ExtractFilterKind,
    GetFieldForFilter,
    IsCustomFilter,
} from "@filter-def/core";

// Validation types
export type { ValidateFilterDef } from "@filter-def/core";

// Utilities
export type { Simplify, TypeError } from "@filter-def/core";
