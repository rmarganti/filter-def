export { drizzleFilter } from "./drizzle-filter.ts";
export type {
    DrizzleCustomFilter,
    DrizzleFilter,
    DrizzleFilterDef,
    DrizzleFilterInput,
} from "./drizzle-filter.ts";

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
