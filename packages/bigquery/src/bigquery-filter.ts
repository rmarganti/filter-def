import type {
    BooleanFilter,
    ContainsFilter,
    CoreFilter,
    CoreFilterField,
    CoreFilterInput,
    PrimitiveFilter,
    Simplify,
    ValidateFilterDef,
} from "@filter-def/core";

const sanitizeParamKey = (key: string): string => key.replace(/\./g, "_");

// ----------------------------------------------------------------
// Entry Point
// ----------------------------------------------------------------

/**
 * Define a filter for a BigQuery table.
 *
 * ```typescript
 * interface User {
 *     id: number;
 *     name: string;
 *     email: string;
 *     age: number;
 * }
 *
 * const userFilter = bigqueryFilter<User>('myproject.dataset.users').def({
 *     name: { kind: 'eq' },
 *     emailContains: { kind: 'contains', field: 'email' },
 * });
 * ```
 *
 * The resulting filter definition accepts a set of filter values and returns
 * a BigQuery-compatible query object with SQL and params.
 *
 * ```typescript
 * const where = userFilter({ name: 'John' });
 * // where = { sql: 'name = @name', params: { name: 'John' } }
 *
 * // Use with @google-cloud/bigquery:
 * const [rows] = await bigquery.query({
 *     query: `SELECT * FROM \`myproject.dataset.users\` WHERE ${where.sql}`,
 *     params: where.params,
 * });
 * ```
 *
 * Custom filters can return SQL and params directly:
 *
 * ```typescript
 * const userFilter = bigqueryFilter<User>('myproject.dataset.users').def({
 *     ageDivisibleBy: (divisor: number) => ({
 *         sql: 'MOD(age, @divisor) = 0',
 *         params: { divisor },
 *     }),
 * });
 * ```
 */
export const bigqueryFilter = <Entity>() => {
    const def = <TFilterDef extends BigQueryFilterDef<Entity>>(
        filterDef: TFilterDef & ValidateFilterDef<Entity, TFilterDef>,
    ): BigQueryFilter<Simplify<BigQueryFilterDefInput<Entity, TFilterDef>>> => {
        return compileFilterDef<Entity, TFilterDef>(filterDef);
    };

    return { def };
};

// ----------------------------------------------------------------
// Core Types
// ----------------------------------------------------------------

/**
 * The result of a BigQuery filter operation, containing SQL and parameters.
 */
export interface BigQueryFilterResult {
    sql: string;
    params: Record<string, unknown>;
}

/**
 * A higher-order function that accepts a filter input (ie. `{ name: 'Bob' }`)
 * and returns a BigQuery SQL fragment with parameters, or undefined.
 */
export type BigQueryFilter<TFilterInput> = (
    filterInput?: TFilterInput,
) => BigQueryFilterResult;

/**
 * The expected input for a BigQueryFilter.
 *
 * ```typescript
 * const userFilter = bigqueryFilter<User>('table').def({ ... });
 * type UserFilterInput = BigQueryFilterInput<typeof userFilter>;
 * ```
 */
export type BigQueryFilterInput<T> =
    T extends BigQueryFilter<infer TInput> ? TInput : never;

/**
 * Custom filter function that returns BigQuery SQL and params.
 * Unlike memory package which takes (entity, input), bigquery custom filters
 * take just (input).
 */
export type BigQueryCustomFilter<Input> = (
    input: Input,
) => BigQueryFilterResult;

/**
 * A single filter field definition for BigQuery.
 */
type BigQueryFilterField<Entity> =
    | CoreFilterField<Entity>
    | BigQueryCustomFilter<any>;

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

/**
 * Filter definition type for BigQuery.
 * Allows core filter field definitions or custom SQL filter functions.
 */
export type BigQueryFilterDef<Entity> = Record<
    string,
    BigQueryFilterField<Entity>
>;

/**
 * Extract the input type for a BigQueryFilterDef.
 */
export type BigQueryFilterDefInput<
    Entity,
    TFilterDef extends BigQueryFilterDef<Entity>,
> = {
    [K in keyof TFilterDef]?: TFilterDef[K] extends BigQueryFilterField<Entity>
        ? BigQueryFilterFieldInput<K, Entity, TFilterDef[K]>
        : never;
};

// Helper type for filter field input
type BigQueryFilterFieldInput<K extends PropertyKey, Entity, TFilterField> =
    TFilterField extends BigQueryCustomFilter<infer Input>
        ? Input
        : TFilterField extends CoreFilter<Entity>
          ? CoreFilterInput<K, Entity, TFilterField>
          : never;

// ----------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------

/**
 * A compiled filter field that generates SQL and params for a single filter.
 */
type CompiledFilterField = (
    filterValue: unknown,
    paramKey: string,
) => BigQueryFilterResult;

const EMPTY_FILTER_RESULT: BigQueryFilterResult = {
    sql: "true",
    params: {},
};

/**
 * Pre-compiles a filter definition into an optimized function that returns SQL and params.
 */
const compileFilterDef = <Entity, TFilterDef extends BigQueryFilterDef<Entity>>(
    filtersDef: TFilterDef,
): BigQueryFilter<BigQueryFilterDefInput<Entity, TFilterDef>> => {
    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        compiler: CompiledFilterField;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        compiler: compileFilterField<Entity>(key, filterDef),
    }));

    // Return the optimized filter function
    return (filterInput) => {
        if (!filterInput) {
            return EMPTY_FILTER_RESULT;
        }

        const sqlFragments: string[] = [];
        const allParams: Record<string, unknown> = {};

        for (let i = 0; i < compiledFilters.length; i++) {
            const { key, compiler } = compiledFilters[i];
            const filterValue = filterInput[key as keyof typeof filterInput];

            // If no filter value provided, skip this filter
            if (filterValue === undefined) {
                continue;
            }

            const result = compiler(filterValue, sanitizeParamKey(key));
            sqlFragments.push(result.sql);
            Object.assign(allParams, result.params);
        }

        // Returning `undefined` means there is no WHERE clause to apply.
        if (sqlFragments.length === 0) {
            return EMPTY_FILTER_RESULT;
        }

        if (sqlFragments.length === 1) {
            return {
                sql: sqlFragments[0],
                params: allParams,
            };
        }

        return {
            sql: sqlFragments.join(" AND "),
            params: allParams,
        };
    };
};

/**
 * Pre-compiles a filter field into a function that generates SQL and params.
 */
const compileFilterField = <Entity>(
    key: string,
    filterField: BigQueryFilterField<Entity>,
): CompiledFilterField => {
    // Custom filter - call the function directly with input
    if (typeof filterField === "function") {
        return (filterValue) => filterField(filterValue);
    }

    switch (filterField.kind) {
        case "and":
        case "or":
            return compileBooleanFilter<Entity>(key, filterField);

        default:
            return compilePrimitiveFilter<Entity>(key, filterField);
    }
};

/**
 * Pre-compiles a boolean filter (and/or) into a function that generates SQL and params.
 */
const compileBooleanFilter = <Entity>(
    key: string,
    filterField: BooleanFilter<Entity>,
): CompiledFilterField => {
    const compiledConditions = filterField.conditions.map((condition, index) =>
        compilePrimitiveFilter<Entity>(
            `${key}_${index}`,
            condition,
            condition.field as string,
        ),
    );

    switch (filterField.kind) {
        case "and":
            return (filterValue, _paramKey) => {
                const fragments: string[] = [];
                const params: Record<string, unknown> = {};

                for (let i = 0; i < compiledConditions.length; i++) {
                    const result = compiledConditions[i](
                        filterValue,
                        `${sanitizeParamKey(key)}_${i}`,
                    );
                    fragments.push(result.sql);
                    Object.assign(params, result.params);
                }

                if (fragments.length === 0) return EMPTY_FILTER_RESULT;
                if (fragments.length === 1)
                    return { sql: fragments[0], params };
                return { sql: `(${fragments.join(" AND ")})`, params };
            };

        case "or":
            return (filterValue, _paramKey) => {
                const fragments: string[] = [];
                const params: Record<string, unknown> = {};

                for (let i = 0; i < compiledConditions.length; i++) {
                    const result = compiledConditions[i](
                        filterValue,
                        `${sanitizeParamKey(key)}_${i}`,
                    );
                    fragments.push(result.sql);
                    Object.assign(params, result.params);
                }

                if (fragments.length === 0) return EMPTY_FILTER_RESULT;
                if (fragments.length === 1)
                    return { sql: fragments[0], params };
                return { sql: `(${fragments.join(" OR ")})`, params };
            };
    }
};

/**
 * Pre-compiles a primitive filter into a function that generates SQL and params.
 */
const compilePrimitiveFilter = <Entity>(
    key: string,
    filterField: PrimitiveFilter<Entity>,
    fieldOverride?: string,
): CompiledFilterField => {
    const fieldName = fieldOverride ?? (filterField.field as string) ?? key;

    switch (filterField.kind) {
        case "eq":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} = @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        case "neq":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} != @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        case "contains": {
            const containsFilter = filterField as ContainsFilter<Entity>;
            if (containsFilter.caseInsensitive) {
                return (filterValue, paramKey) => ({
                    sql: `LOWER(${fieldName}) LIKE LOWER(@${paramKey})`,
                    params: { [paramKey]: `%${String(filterValue)}%` },
                });
            }
            return (filterValue, paramKey) => ({
                sql: `${fieldName} LIKE @${paramKey}`,
                params: { [paramKey]: `%${String(filterValue)}%` },
            });
        }

        case "inArray":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} IN UNNEST(@${paramKey})`,
                params: { [paramKey]: filterValue },
            });

        case "isNull":
            return (filterValue) =>
                filterValue
                    ? { sql: `${fieldName} IS NULL`, params: {} }
                    : { sql: `${fieldName} IS NOT NULL`, params: {} };

        case "isNotNull":
            return (filterValue) =>
                filterValue
                    ? { sql: `${fieldName} IS NOT NULL`, params: {} }
                    : { sql: `${fieldName} IS NULL`, params: {} };

        case "gt":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} > @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        case "gte":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} >= @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        case "lt":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} < @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        case "lte":
            return (filterValue, paramKey) => ({
                sql: `${fieldName} <= @${paramKey}`,
                params: { [paramKey]: filterValue },
            });

        default:
            filterField satisfies never;
            return () => EMPTY_FILTER_RESULT;
    }
};
