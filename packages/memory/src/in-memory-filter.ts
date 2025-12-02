import type {
    BooleanFilter,
    CoreFilter,
    CoreFilterField,
    CoreFilterInput,
    CoreFilterKind,
    PrimitiveFilter,
    Simplify,
    ValidateFilterDef,
} from "@filter-def/core";

// ----------------------------------------------------------------
// Entry Point
// ----------------------------------------------------------------

/**
 * Signify what kind of data we will be filtering.
 *
 * ```typescript
 * interface User {
 *     id: string;
 *     name: string;
 *     email: string;
 * }
 *
 * const user = inMemoryFilter<User>();
 * ```
 *
 * You can then use the entity definition to define our filters.
 *
 * ```typescript
 * const userFilter = user.filterDef({
 *     name: { kind: 'eq', field: 'name' },
 *     email: { kind: 'eq', field: 'email' },
 * });
 * ```
 *
 * You can also do this all at once, instead of defining the entity and then the
 * filter definition separately.
 *
 * ```typescript
 * const userFilter = inMemoryFilter<User>().filterDef({ ... })
 * ```
 *
 * This resulting filter definition accepts a set of filter values, which
 * creates a predicate that can be passed to Array `filter()`, `find()`,
 * `some()`, and `every()` methods.
 *
 * ```typescript
 * const where = userFilter({
 *     email: 'john.doe@example.com',
 * });
 *
 * const johnUser = myUserArray.find(where);
 * ```
 */
export const inMemoryFilter = <Entity>() => {
    const filterDef = <TFilterDef extends InMemoryFilterDef<Entity>>(
        filterDef: TFilterDef & ValidateFilterDef<Entity, TFilterDef>,
    ): InMemoryFilter<
        Entity,
        Simplify<InMemoryFilterDefInput<Entity, TFilterDef>>
    > => {
        return compileFilterDef(filterDef);
    };

    return { filterDef };
};

// ----------------------------------------------------------------
// Core Types
// ----------------------------------------------------------------

/**
 * A higher-order function that accepts a filter input (ie. `{ name: 'Bob' }`)
 * and returns a function that determines if an entity passes the filter.
 */
export type InMemoryFilter<Entity, TFilterInput> = (
    filterInput?: TFilterInput,
) => (entity: Entity) => boolean;

/**
 * The expected input for a InMemoryFilter.
 *
 * ```typescript
 * const userFilter = inMemoryFilter<User>().filterDef({ ... });
 * type UserFilterInput = InMemoryFilterInput<typeof userFilter>;
 * ```
 */
export type InMemoryFilterInput<TFilter> =
    TFilter extends InMemoryFilter<infer _TEntity, infer TFilterInput>
        ? TFilterInput
        : never;

/**
 * A function that accepts an entity and determines if a specific, custom filter passes.
 */
export type InMemoryCustomFilter<Entity, Input> = (
    entity: Entity,
    input: Input,
) => boolean;

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

/**
 * A record of filter field definitions for a given entity type.
 */
export type InMemoryFilterDef<Entity> = Record<
    string,
    InMemoryFilterField<Entity>
>;

/**
 * A single filter definition, ie. `{ kind: 'eq', field: 'email' }`
 */
export type InMemoryFilterField<Entity> =
    | CoreFilterField<Entity>
    | InMemoryCustomFilter<Entity, any>;

// ----------------------------------------------------------------
// Adapter utilities
// ----------------------------------------------------------------

/**
 * Extracts the filter kind from a filter field definition.
 * Returns the string literal kind for primitive/boolean filters, or 'custom' for custom filters.
 */
export type ExtractFilterKind<TFilterField> = TFilterField extends {
    kind: infer K extends CoreFilterKind;
}
    ? K
    : TFilterField extends (...args: any[]) => any
      ? "custom"
      : never;

/**
 * Checks if a filter field is a custom filter function.
 */
export type IsCustomFilter<TFilterField> = TFilterField extends (
    ...args: any[]
) => any
    ? true
    : false;

/**
 * Extracts the input type for a custom filter function.
 */
export type ExtractCustomFilterInput<TFilterField> =
    TFilterField extends InMemoryCustomFilter<any, infer Input> ? Input : never;

// ----------------------------------------------------------------
// Filter input types
// ----------------------------------------------------------------

/**
 * The expected input for a FilterDef.
 */
export type InMemoryFilterDefInput<
    Entity,
    TFilterDef extends InMemoryFilterDef<Entity>,
> = {
    [K in keyof TFilterDef]?: InMemoryFilterFieldInput<
        K,
        Entity,
        TFilterDef[K]
    >;
};

/**
 * The expected input shape for a single filter field.
 */
export type InMemoryFilterFieldInput<
    K extends PropertyKey,
    Entity,
    TFilterField extends InMemoryFilterField<Entity>,
> =
    // Custom Filters
    TFilterField extends InMemoryCustomFilter<Entity, infer TArg>
        ? TArg
        : // Primitive and Boolean Filters
          TFilterField extends CoreFilter<Entity>
          ? CoreFilterInput<K, Entity, TFilterField>
          : never;

// ----------------------------------------------------------------
// Compilation
// ----------------------------------------------------------------

/**
 * A compiled filter field checker function that tests if an entity passes a single filter.
 */
type CompiledFilterField<Entity> = (
    entity: Entity,
    filterValue: unknown,
) => boolean;

/**
 * Pre-compiles a filter definition into an optimized checker function.
 * This then returns a higher-order function that accepts a filter input
 * and returns a function that determines if an entity passes the filter.
 */
const compileFilterDef = <Entity, TFilterDef extends InMemoryFilterDef<Entity>>(
    filtersDef: TFilterDef,
): InMemoryFilter<Entity, InMemoryFilterDefInput<Entity, TFilterDef>> => {
    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        checker: CompiledFilterField<Entity>;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        checker: compileFilterField(key, filterDef),
    }));

    // Return the optimized filter function
    return (filterInput) => (entity) => {
        if (!filterInput) {
            return true;
        }

        // Check if entity passes ALL filters
        for (let i = 0; i < compiledFilters.length; i++) {
            const { key, checker } = compiledFilters[i];
            const filterValue = filterInput[key as keyof typeof filterInput];

            // If no filter value provided, skip this filter (it passes)
            if (filterValue === undefined) {
                continue;
            }

            // Use the pre-compiled checker
            if (!checker(entity, filterValue)) {
                return false;
            }
        }

        return true;
    };
};

/**
 * Pre-compiles a filter field into an optimized checker function.
 */
const compileFilterField = <Entity>(
    key: string,
    filterField: InMemoryFilterField<Entity>,
): CompiledFilterField<Entity> => {
    if (typeof filterField === "function") {
        return filterField;
    }

    switch (filterField.kind) {
        case "and":
        case "or":
            return compileBooleanFilter(filterField);

        default:
            return compilePrimitiveFilter(key, filterField);
    }
};

/**
 * Pre-compiles a boolean filter definition into an optimized checker function.
 */
const compileBooleanFilter = <Entity>(
    filterField: BooleanFilter<Entity>,
): CompiledFilterField<Entity> => {
    const compiledConditions = filterField.conditions.map((condition) =>
        // Boolean filter conditions must have explicit field property.
        // This is validated elsewhere by `ValidateFilterDef`.
        compilePrimitiveFilter(condition.field as string, condition),
    );

    switch (filterField.kind) {
        case "and":
            return (entity, filterValue) =>
                compiledConditions.every((checker) =>
                    checker(entity, filterValue),
                );

        case "or":
            return (entity, filterValue) =>
                compiledConditions.some((checker) =>
                    checker(entity, filterValue),
                );
    }
};

/**
 * Pre-compiles a primitive filter definition into an optimized checker function.
 */
const compilePrimitiveFilter = <Entity>(
    key: string,
    filterField: PrimitiveFilter<Entity>,
): CompiledFilterField<Entity> => {
    const field = (filterField.field ?? key) as keyof Entity;

    switch (filterField.kind) {
        case "eq":
            return (entity, filterValue) => entity[field] === filterValue;

        case "neq":
            return (entity, filterValue) => entity[field] !== filterValue;

        case "contains": {
            return (entity, filterValue) => {
                const { entityVal, filterVal } = filterField.caseInsensitive
                    ? {
                          entityVal: String(entity[field]).toLocaleLowerCase(),
                          filterVal: String(filterValue).toLocaleLowerCase(),
                      }
                    : {
                          entityVal: String(entity[field]),
                          filterVal: String(filterValue),
                      };

                return entityVal.includes(filterVal);
            };
        }

        case "inArray":
            return (entity, filterValue) =>
                (filterValue as unknown[]).includes(entity[field]);

        case "isNull":
            return (entity, filterValue) =>
                filterValue ? entity[field] == null : entity[field] != null;

        case "isNotNull":
            return (entity, filterValue) =>
                filterValue ? entity[field] != null : entity[field] == null;

        case "gt":
            return (entity, filterValue) =>
                Number(entity[field]) > (filterValue as number);

        case "gte":
            return (entity, filterValue) =>
                Number(entity[field]) >= (filterValue as number);

        case "lt":
            return (entity, filterValue) =>
                Number(entity[field]) < (filterValue as number);

        case "lte":
            return (entity, filterValue) =>
                Number(entity[field]) <= (filterValue as number);

        default:
            filterField satisfies never;
            return () => false;
    }
};
