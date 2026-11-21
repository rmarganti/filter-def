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
 * const userFilter = bigqueryFilter<User>().def({
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
 * const userFilter = bigqueryFilter<User>().def({
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
 * const userFilter = bigqueryFilter<User>().def({ ... });
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
 * Param names are allocated once, at definition time.
 */
type CompiledFilterField = (filterValue: unknown) => BigQueryFilterResult;

/**
 * Hands out param names that are unique within a single filter definition.
 */
type ParamNameAllocator = (filterKey: string) => string;

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
    const allocateParamName = createParamNameAllocator();

    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        compiler: CompiledFilterField;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        compiler: compileFilterField<Entity>(key, filterDef, allocateParamName),
    }));

    // Return the optimized filter function
    return (filterInput) => {
        if (!filterInput) {
            return EMPTY_FILTER_RESULT;
        }

        const sqlFragments: string[] = [];
        const allParams: Record<string, unknown> = {};
        const usedParamNames = new Set<string>();

        for (let i = 0; i < compiledFilters.length; i++) {
            const { key, compiler } = compiledFilters[i];
            const filterValue = filterInput[key as keyof typeof filterInput];

            // If no filter value provided, skip this filter
            if (filterValue === undefined) {
                continue;
            }

            const result = compiler(filterValue);
            sqlFragments.push(result.sql);
            mergeParams(allParams, usedParamNames, result.params, key);
        }

        if (sqlFragments.length === 0) {
            return EMPTY_FILTER_RESULT;
        }

        // Every fragment is self-contained (an atomic comparison or a
        // parenthesized group), so joining with AND can't change its meaning.
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
    allocateParamName: ParamNameAllocator,
): CompiledFilterField => {
    // Custom filter - call the function directly with input. The SQL is
    // wrapped in parentheses so an `OR` inside it can't leak into the
    // surrounding `AND`s.
    if (typeof filterField === "function") {
        return (filterValue) => {
            const result = filterField(filterValue);
            return { sql: `(${result.sql})`, params: result.params };
        };
    }

    switch (filterField.kind) {
        case "and":
        case "or":
            return compileBooleanFilter<Entity>(
                key,
                filterField,
                allocateParamName,
            );

        default:
            return compilePrimitiveFilter<Entity>(
                key,
                filterField,
                allocateParamName,
            );
    }
};

/**
 * Pre-compiles a boolean filter (and/or) into a function that generates SQL and params.
 */
const compileBooleanFilter = <Entity>(
    key: string,
    filterField: BooleanFilter<Entity>,
    allocateParamName: ParamNameAllocator,
): CompiledFilterField => {
    const compiledConditions = filterField.conditions.map((condition, index) =>
        compilePrimitiveFilter<Entity>(
            `${key}_${index}`,
            condition,
            allocateParamName,
            condition.field as string,
        ),
    );

    const joiner = filterField.kind === "and" ? " AND " : " OR ";

    return (filterValue) => {
        const fragments: string[] = [];
        const params: Record<string, unknown> = {};

        for (let i = 0; i < compiledConditions.length; i++) {
            const result = compiledConditions[i](filterValue);
            fragments.push(result.sql);
            Object.assign(params, result.params);
        }

        if (fragments.length === 0) return EMPTY_FILTER_RESULT;
        if (fragments.length === 1) return { sql: fragments[0], params };
        return { sql: `(${fragments.join(joiner)})`, params };
    };
};

/**
 * Pre-compiles a primitive filter into a function that generates SQL and params.
 */
const compilePrimitiveFilter = <Entity>(
    key: string,
    filterField: PrimitiveFilter<Entity>,
    allocateParamName: ParamNameAllocator,
    fieldOverride?: string,
): CompiledFilterField => {
    const column = quoteFieldPath(
        fieldOverride ?? (filterField.field as string) ?? key,
    );

    switch (filterField.kind) {
        case "isNull":
            return (filterValue) =>
                filterValue
                    ? { sql: `${column} IS NULL`, params: {} }
                    : { sql: `${column} IS NOT NULL`, params: {} };

        case "isNotNull":
            return (filterValue) =>
                filterValue
                    ? { sql: `${column} IS NOT NULL`, params: {} }
                    : { sql: `${column} IS NULL`, params: {} };

        case "contains": {
            const paramName = allocateParamName(key);
            const containsFilter = filterField as ContainsFilter<Entity>;
            const sql = containsFilter.caseInsensitive
                ? `LOWER(${column}) LIKE LOWER(@${paramName})`
                : `${column} LIKE @${paramName}`;

            return (filterValue) => ({
                sql,
                params: {
                    [paramName]: `%${escapeLikePattern(String(filterValue))}%`,
                },
            });
        }

        case "eq":
        case "neq":
        case "inArray":
        case "gt":
        case "gte":
        case "lt":
        case "lte": {
            const paramName = allocateParamName(key);
            const sql = comparisonSql(filterField.kind, column, paramName);

            return (filterValue) => ({
                sql,
                params: { [paramName]: filterValue },
            });
        }

        default:
            filterField satisfies never;
            return () => EMPTY_FILTER_RESULT;
    }
};

/**
 * Builds the SQL for a single-param comparison filter.
 */
const comparisonSql = (
    kind: "eq" | "neq" | "inArray" | "gt" | "gte" | "lt" | "lte",
    column: string,
    paramName: string,
): string => {
    switch (kind) {
        case "eq":
            return `${column} = @${paramName}`;
        case "neq":
            return `${column} != @${paramName}`;
        case "inArray":
            return `${column} IN UNNEST(@${paramName})`;
        case "gt":
            return `${column} > @${paramName}`;
        case "gte":
            return `${column} >= @${paramName}`;
        case "lt":
            return `${column} < @${paramName}`;
        case "lte":
            return `${column} <= @${paramName}`;
        default:
            kind satisfies never;
            return "true";
    }
};

// ----------------------------------------------------------------
// SQL helpers
// ----------------------------------------------------------------

/**
 * Quotes a dot-separated field path as BigQuery identifiers, so reserved
 * words (`order`, `group`, ...) and odd characters are safe.
 *
 * `address.city` -> `` `address`.`city` ``
 */
const quoteFieldPath = (path: string): string =>
    path
        .split(".")
        .map((segment) => `\`${segment.replace(/[\\`]/g, "\\$&")}\``)
        .join(".");

/**
 * Escapes LIKE wildcards (`%`, `_`) and the escape character (`\`) so the
 * value is matched literally.
 */
const escapeLikePattern = (value: string): string =>
    value.replace(/[\\%_]/g, "\\$&");

/**
 * Creates an allocator that turns filter keys into valid, unique BigQuery
 * param names. BigQuery param names are case-insensitive, so uniqueness is
 * checked case-insensitively. Collisions get a numeric suffix (`a_b_2`).
 */
const createParamNameAllocator = (): ParamNameAllocator => {
    const used = new Set<string>();

    return (filterKey) => {
        const base = toParamName(filterKey);
        let name = base;

        for (let n = 2; used.has(name.toLowerCase()); n++) {
            name = `${base}_${n}`;
        }

        used.add(name.toLowerCase());
        return name;
    };
};

/**
 * Converts a filter key into a valid BigQuery param name: letters, digits and
 * underscores, not starting with a digit.
 */
const toParamName = (key: string): string => {
    const name = key.replace(/[^A-Za-z0-9_]/g, "_");
    return /^[A-Za-z_]/.test(name) ? name : `_${name}`;
};

/**
 * Merges a filter's params into the combined params, throwing if a param name
 * is already taken. Built-in filters never collide with each other, so this
 * only fires when a custom filter reuses a name.
 */
const mergeParams = (
    target: Record<string, unknown>,
    usedNames: Set<string>,
    params: Record<string, unknown>,
    filterKey: string,
): void => {
    for (const name of Object.keys(params)) {
        const normalized = name.toLowerCase();

        if (usedNames.has(normalized)) {
            throw new Error(
                `@filter-def/bigquery: filter "${filterKey}" uses param "@${name}", ` +
                    "which another filter in this query already uses. " +
                    "Give the custom filter's param a unique name.",
            );
        }

        usedNames.add(normalized);
        target[name] = params[name];
    }
};
