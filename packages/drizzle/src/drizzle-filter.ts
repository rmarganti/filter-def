import type {
    BooleanFilter,
    ContainsFilter,
    GetFieldForFilter,
    PrimitiveFilter,
    Simplify,
} from "@filter-def/core";
import type { Column, SQL, Table } from "drizzle-orm";
import {
    and,
    eq,
    getTableColumns,
    gt,
    gte,
    ilike,
    inArray,
    isNotNull,
    isNull,
    like,
    lt,
    lte,
    ne,
    or,
} from "drizzle-orm";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

/**
 * A higher-order function that accepts a filter input (ie. `{ name: 'Bob' }`)
 * and returns a Drizzle SQL expression or undefined.
 */
export type DrizzleFilter<TFilterInput> = (
    filterInput?: TFilterInput,
) => SQL | undefined;

/**
 * Custom filter function that returns a Drizzle SQL expression.
 * Unlike memory package which takes (entity, input), drizzle custom filters
 * take just (input).
 */
export type DrizzleCustomFilter<Input> = (input: Input) => SQL | undefined;

/**
 * A single filter field definition for Drizzle.
 */
type DrizzleFilterField<Entity> =
    | PrimitiveFilter<Entity>
    | BooleanFilter<Entity>
    | DrizzleCustomFilter<any>;

/**
 * Filter definition type for Drizzle.
 * Allows standard FilterField definitions or custom SQL filter functions.
 */
export type DrizzleFilterDef<Entity> = Record<
    string,
    DrizzleFilterField<Entity>
>;

/**
 * Extract the input type for a DrizzleFilterDef.
 */
export type DrizzleFilterDefInput<
    Entity,
    TFilterDef extends DrizzleFilterDef<Entity>,
> = {
    [K in keyof TFilterDef]?: TFilterDef[K] extends (
        input: infer I,
    ) => SQL | undefined
        ? I
        : TFilterDef[K] extends DrizzleFilterField<Entity>
          ? FilterFieldInput<K, Entity, TFilterDef[K]>
          : never;
};

// Helper type for filter field input
type FilterFieldInput<
    K extends PropertyKey,
    Entity,
    TFilterField,
> = TFilterField extends { kind: "eq" }
    ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
    : TFilterField extends { kind: "neq" }
      ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
      : TFilterField extends { kind: "contains" }
        ? string
        : TFilterField extends { kind: "inArray" }
          ? Entity[GetFieldForFilter<K, Entity, TFilterField>][]
          : TFilterField extends { kind: "isNull" }
            ? boolean
            : TFilterField extends { kind: "isNotNull" }
              ? boolean
              : TFilterField extends { kind: "gt" }
                ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
                : TFilterField extends { kind: "gte" }
                  ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
                  : TFilterField extends { kind: "lt" }
                    ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
                    : TFilterField extends { kind: "lte" }
                      ? Entity[GetFieldForFilter<K, Entity, TFilterField>]
                      : TFilterField extends {
                              kind: "and";
                              conditions: infer Conditions;
                          }
                        ? Conditions extends [infer First, ...unknown[]]
                            ? FilterFieldInput<K, Entity, First>
                            : never
                        : TFilterField extends {
                                kind: "or";
                                conditions: infer Conditions;
                            }
                          ? Conditions extends [infer First, ...unknown[]]
                              ? FilterFieldInput<K, Entity, First>
                              : never
                          : never;

// ----------------------------------------------------------------
// Entry Point
// ----------------------------------------------------------------

/**
 * Define a filter for a Drizzle table.
 *
 * ```typescript
 * import { pgTable, text, integer } from 'drizzle-orm/pg-core';
 *
 * const usersTable = pgTable('users', {
 *     id: integer('id').primaryKey(),
 *     name: text('name').notNull(),
 *     email: text('email').notNull(),
 * });
 *
 * const userFilter = drizzleFilter(usersTable).filterDef({
 *     name: { kind: 'eq' },
 *     emailContains: { kind: 'contains', field: 'email' },
 * });
 * ```
 *
 * The resulting filter definition accepts a set of filter values and returns
 * a Drizzle SQL expression that can be passed to `.where()`.
 *
 * ```typescript
 * const where = userFilter({ name: 'John' });
 * await db.select().from(usersTable).where(where);
 * ```
 *
 * Custom filters can return SQL expressions directly:
 *
 * ```typescript
 * import { sql, eq } from 'drizzle-orm';
 *
 * const userFilter = drizzleFilter(usersTable).filterDef({
 *     ageDivisibleBy: (divisor: number) =>
 *         sql`${usersTable.age} % ${divisor} = 0`,
 * });
 * ```
 */
export const drizzleFilter = <TTable extends Table>(table: TTable) => {
    type Entity = TTable["$inferSelect"];
    const columns = getTableColumns(table);

    const filterDef = <TFilterDef extends DrizzleFilterDef<Entity>>(
        filtersDef: TFilterDef,
    ): DrizzleFilter<Simplify<DrizzleFilterDefInput<Entity, TFilterDef>>> => {
        return compileFilterDef<Entity, TFilterDef>(columns, filtersDef);
    };

    return { filterDef };
};

// ----------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------

type ColumnsMap = Record<string, Column>;

/**
 * A compiled filter field that generates SQL for a single filter.
 */
type CompiledFilterField = (filterValue: unknown) => SQL | undefined;

/**
 * Pre-compiles a filter definition into an optimized function that returns SQL.
 */
const compileFilterDef = <Entity, TFilterDef extends DrizzleFilterDef<Entity>>(
    columns: ColumnsMap,
    filtersDef: TFilterDef,
): DrizzleFilter<DrizzleFilterDefInput<Entity, TFilterDef>> => {
    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        compiler: CompiledFilterField;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        compiler: compileFilterField<Entity>(columns, key, filterDef),
    }));

    // Return the optimized filter function
    return (filterInput?: DrizzleFilterDefInput<Entity, TFilterDef>) => {
        if (!filterInput) {
            return undefined;
        }

        const conditions: SQL[] = [];

        for (let i = 0; i < compiledFilters.length; i++) {
            const { key, compiler } = compiledFilters[i];
            const filterValue = filterInput[key as keyof typeof filterInput];

            // If no filter value provided, skip this filter
            if (filterValue === undefined) {
                continue;
            }

            const sql = compiler(filterValue);
            if (sql) {
                conditions.push(sql);
            }
        }

        if (conditions.length === 0) {
            return undefined;
        }

        if (conditions.length === 1) {
            return conditions[0];
        }

        return and(...conditions);
    };
};

/**
 * Pre-compiles a filter field into a function that generates SQL.
 */
const compileFilterField = <Entity>(
    columns: ColumnsMap,
    key: string,
    filterField: DrizzleFilterField<Entity> | ((input: any) => SQL | undefined),
): CompiledFilterField => {
    // Custom filter - call the function directly with input
    if (typeof filterField === "function") {
        return (filterValue) => filterField(filterValue);
    }

    // Type guard for filter field with kind property
    const filterWithKind = filterField as { kind: string };

    switch (filterWithKind.kind) {
        case "and":
        case "or":
            return compileBooleanFilter<Entity>(
                columns,
                filterField as BooleanFilter<Entity>,
            );

        default:
            return compilePrimitiveFilter<Entity>(
                columns,
                key,
                filterField as PrimitiveFilter<Entity>,
            );
    }
};

/**
 * Pre-compiles a boolean filter (and/or) into a function that generates SQL.
 */
const compileBooleanFilter = <Entity>(
    columns: ColumnsMap,
    filterField: BooleanFilter<Entity>,
): CompiledFilterField => {
    const compiledConditions = filterField.conditions.map((condition) =>
        compilePrimitiveFilter<Entity>(
            columns,
            condition.field as string,
            condition,
        ),
    );

    switch (filterField.kind) {
        case "and":
            return (filterValue) => {
                const conditions = compiledConditions
                    .map((compiler) => compiler(filterValue))
                    .filter((sql): sql is SQL => sql !== undefined);

                if (conditions.length === 0) return undefined;
                if (conditions.length === 1) return conditions[0];
                return and(...conditions);
            };

        case "or":
            return (filterValue) => {
                const conditions = compiledConditions
                    .map((compiler) => compiler(filterValue))
                    .filter((sql): sql is SQL => sql !== undefined);

                if (conditions.length === 0) return undefined;
                if (conditions.length === 1) return conditions[0];
                return or(...conditions);
            };
    }
};

/**
 * Pre-compiles a primitive filter into a function that generates SQL.
 */
const compilePrimitiveFilter = <Entity>(
    columns: ColumnsMap,
    key: string,
    filterField: PrimitiveFilter<Entity>,
): CompiledFilterField => {
    const fieldName = (filterField.field ?? key) as string;
    const column = columns[fieldName];

    if (!column) {
        throw new Error(
            `Column "${fieldName}" not found in table. Available columns: ${Object.keys(columns).join(", ")}`,
        );
    }

    switch (filterField.kind) {
        case "eq":
            return (filterValue) => eq(column, filterValue);

        case "neq":
            return (filterValue) => ne(column, filterValue);

        case "contains": {
            const containsFilter = filterField as ContainsFilter<Entity>;
            if (containsFilter.caseInsensitive) {
                return (filterValue) =>
                    ilike(column, `%${String(filterValue)}%`);
            }
            return (filterValue) => like(column, `%${String(filterValue)}%`);
        }

        case "inArray":
            return (filterValue) => inArray(column, filterValue as unknown[]);

        case "isNull":
            return (filterValue) =>
                filterValue ? isNull(column) : isNotNull(column);

        case "isNotNull":
            return (filterValue) =>
                filterValue ? isNotNull(column) : isNull(column);

        case "gt":
            return (filterValue) => gt(column, filterValue);

        case "gte":
            return (filterValue) => gte(column, filterValue);

        case "lt":
            return (filterValue) => lt(column, filterValue);

        case "lte":
            return (filterValue) => lte(column, filterValue);

        default:
            filterField satisfies never;
            return () => undefined;
    }
};
