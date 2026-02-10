export { bigqueryFilter } from "./bigquery-filter.ts";
export type {
    BigQueryCustomFilter,
    BigQueryFilter,
    BigQueryFilterDef,
    BigQueryFilterInput,
    BigQueryFilterResult,
} from "./bigquery-filter.ts";

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
