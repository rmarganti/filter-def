import type {
    BooleanFilter,
    CoreFilter,
    CoreFilterField,
    CoreFilterInput,
    FieldPath,
    PrimitiveFilter,
    Simplify,
    ValidateFilterDef,
} from "@filter-def/core";
import type { Dialect, SqlFragment } from "./fragment.ts";
import { fragment, join, parens, raw } from "./fragment.ts";

// ----------------------------------------------------------------
// Core Types
// ----------------------------------------------------------------

/**
 * Options shared by every filter defined for an entity.
 */
export interface SqlFilterOptions<Entity> {
    /**
     * Column names that differ from the entity's field names. Fields not
     * listed here are used exactly as written. Dots in a column name are
     * treated as qualifiers, ie. `{ name: "u.name" }` becomes `"u"."name"`.
     */
    columns?: Partial<Record<FieldPath<Entity>, string>>;
}

/**
 * A higher-order function that accepts a filter input (ie. `{ name: 'Bob' }`)
 * and returns a SQL fragment to interpolate into the dialect's `sql` tag.
 * When no filters apply, the fragment is `TRUE`.
 */
export type SqlFilter<TFilterInput> = (
    filterInput?: TFilterInput,
) => SqlFragment;

/**
 * The expected input for a SqlFilter.
 *
 * ```typescript
 * const userFilter = sqlFilter<User>().def({ ... });
 * type UserFilterInput = SqlFilterInput<typeof userFilter>;
 * ```
 */
export type SqlFilterInput<T> =
    T extends SqlFilter<infer TInput> ? TInput : never;

/**
 * Custom filter function that returns a SQL fragment, built with the
 * dialect's `sql` tag. Return `undefined` to skip the filter.
 * The fragment is always wrapped in parentheses.
 */
export type SqlCustomFilter<Input> = (input: Input) => SqlFragment | undefined;

/**
 * A single filter field definition.
 */
type SqlFilterField<Entity> = CoreFilterField<Entity> | SqlCustomFilter<any>;

/**
 * Filter definition type. Allows core filters or custom SQL filters.
 */
export type SqlFilterDef<Entity> = Record<string, SqlFilterField<Entity>>;

/**
 * Extract the input type for a SqlFilterDef.
 */
export type SqlFilterDefInput<
    Entity,
    TFilterDef extends SqlFilterDef<Entity>,
> = {
    [K in keyof TFilterDef]?: TFilterDef[K] extends SqlFilterField<Entity>
        ? SqlFilterFieldInput<K, Entity, TFilterDef[K]>
        : never;
};

type SqlFilterFieldInput<K extends PropertyKey, Entity, TFilterField> =
    TFilterField extends SqlCustomFilter<infer Input>
        ? Input
        : TFilterField extends CoreFilter<Entity>
          ? CoreFilterInput<K, Entity, TFilterField>
          : never;

/**
 * The `sqlFilter` entry point exported by each dialect.
 */
export type SqlFilterFactory = ReturnType<typeof createSqlFilter>;

// ----------------------------------------------------------------
// Entry Point
// ----------------------------------------------------------------

export const createSqlFilter =
    <TQuery>(dialect: Dialect<TQuery>) =>
    <Entity>(options: SqlFilterOptions<Entity> = {}) => {
        const def = <TFilterDef extends SqlFilterDef<Entity>>(
            filterDef: TFilterDef & ValidateFilterDef<Entity, TFilterDef>,
        ): SqlFilter<Simplify<SqlFilterDefInput<Entity, TFilterDef>>> =>
            compileFilterDef(dialect, options, filterDef);

        return { def };
    };

// ----------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------

type CompiledFilterField = (filterValue: unknown) => SqlFragment | undefined;

const TRUE = raw("TRUE");
const FALSE = raw("FALSE");

const compileFilterDef = <Entity>(
    dialect: Dialect<unknown>,
    options: SqlFilterOptions<Entity>,
    filtersDef: SqlFilterDef<Entity>,
): SqlFilter<any> => {
    const context: CompileContext = {
        dialect,
        resolveColumn: createColumnResolver(dialect, options),
    };

    // Pre-compile all filters at definition time
    const compiledFilters = Object.entries(filtersDef).map(
        ([key, filterField]) => ({
            key,
            compiler: compileFilterField(context, key, filterField),
        }),
    );

    return (filterInput) => {
        if (!filterInput) return TRUE;

        const conditions: SqlFragment[] = [];

        for (let i = 0; i < compiledFilters.length; i++) {
            const { key, compiler } = compiledFilters[i];
            const filterValue = filterInput[key];

            if (filterValue === undefined) continue;

            const condition = compiler(filterValue);
            if (condition) conditions.push(condition);
        }

        if (conditions.length === 0) return TRUE;
        if (conditions.length === 1) return conditions[0];

        // Wrap so the result is safe next to any operator in the outer query.
        return parens(join(conditions, " AND "));
    };
};

type ColumnResolver = (fieldPath: string) => SqlFragment;

interface CompileContext {
    dialect: Dialect<unknown>;
    resolveColumn: ColumnResolver;
}

const createColumnResolver =
    <Entity>(
        dialect: Dialect<unknown>,
        options: SqlFilterOptions<Entity>,
    ): ColumnResolver =>
    (fieldPath) => {
        const columns = options.columns as Record<string, string> | undefined;
        const renamed = columns?.[fieldPath];

        if (renamed === undefined && fieldPath.includes(".")) {
            if (!dialect.allowsNestedPaths) {
                throw new Error(
                    `Nested field path "${fieldPath}" is not supported by this dialect. ` +
                        `Map it to a column with the \`columns\` option, or use a custom filter.`,
                );
            }
        }

        const column = renamed ?? fieldPath;
        return raw(column.split(".").map(dialect.quoteIdentifier).join("."));
    };

const compileFilterField = <Entity>(
    context: CompileContext,
    key: string,
    filterField: SqlFilterField<Entity>,
): CompiledFilterField => {
    if (typeof filterField === "function") {
        return (filterValue) => {
            const result = filterField(filterValue);
            return result ? parens(result) : undefined;
        };
    }

    switch (filterField.kind) {
        case "and":
        case "or":
            return compileBooleanFilter(context, filterField);

        default:
            return compilePrimitiveFilter(context, key, filterField);
    }
};

const compileBooleanFilter = <Entity>(
    context: CompileContext,
    filterField: BooleanFilter<Entity>,
): CompiledFilterField => {
    const compiledConditions = filterField.conditions.map((condition) =>
        // Boolean conditions always have an explicit field (see `ValidateFilterDef`).
        compilePrimitiveFilter(context, condition.field as string, condition),
    );
    const separator = filterField.kind === "and" ? " AND " : " OR ";

    return (filterValue) => {
        const conditions = compiledConditions.map((compile) =>
            compile(filterValue),
        );

        if (conditions.length === 1) return conditions[0];
        return parens(join(conditions, separator));
    };
};

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

const compilePrimitiveFilter = <Entity>(
    { dialect, resolveColumn }: CompileContext,
    key: string,
    filterField: PrimitiveFilter<Entity>,
): ((filterValue: unknown) => SqlFragment) => {
    const column = resolveColumn((filterField.field ?? key) as string);

    switch (filterField.kind) {
        case "eq":
            return (filterValue) => fragment`${column} = ${filterValue}`;

        case "neq":
            return (filterValue) => fragment`${column} <> ${filterValue}`;

        case "contains": {
            const caseInsensitive = filterField.caseInsensitive ?? false;
            return (filterValue) =>
                dialect.like(
                    column,
                    `%${escapeLike(String(filterValue))}%`,
                    caseInsensitive,
                );
        }

        case "inArray":
            return (filterValue) => {
                const values = filterValue as readonly unknown[];
                return values.length === 0
                    ? FALSE
                    : dialect.inArray(column, values);
            };

        case "isNull":
            return (filterValue) =>
                filterValue
                    ? fragment`${column} IS NULL`
                    : fragment`${column} IS NOT NULL`;

        case "isNotNull":
            return (filterValue) =>
                filterValue
                    ? fragment`${column} IS NOT NULL`
                    : fragment`${column} IS NULL`;

        case "gt":
            return (filterValue) => fragment`${column} > ${filterValue}`;

        case "gte":
            return (filterValue) => fragment`${column} >= ${filterValue}`;

        case "lt":
            return (filterValue) => fragment`${column} < ${filterValue}`;

        case "lte":
            return (filterValue) => fragment`${column} <= ${filterValue}`;

        default:
            filterField satisfies never;
            throw new Error(
                `Unknown filter kind: ${(filterField as { kind: string }).kind}`,
            );
    }
};
