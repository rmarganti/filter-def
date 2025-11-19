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
 * const user = entity<User>();
 * ```
 *
 * You can then use the entity definition to define our filters.
 *
 * ```typescript
 * const userFilter = user.filterDef({
 *     name: { kind: 'equals', field: 'name' },
 *     email: { kind: 'equals', field: 'email' },
 * });
 * ```
 *
 * You can also do this all at once, instead of defining the entity and then the
 * filter definition separately.
 *
 * ```typescript
 * const userFilter = entity<User>().filterDef({ ... })
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
export const entity = <Entity>() => {
    const filterDef = <TFilterDef extends FilterDef<Entity>>(
        FiltersDef: TFilterDef,
    ): Filter<Entity, TFilterDef> => filterFn(FiltersDef);

    return { filterDef };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

export type FilterDef<Entity> = Record<string, FilterField<Entity>>;

/**
 * A single filter definition, ie. `{ kind: 'equals', field: 'email' }`
 */
export type FilterField<T> =
    | PrimitiveFilter<T>
    | BooleanFilter<T>
    | CustomFilter<T, any>;

// -[ Primitive Filters ]----------------------------------------

export type PrimitiveFilter<T> =
    | EqualsFilter<T>
    | ContainsFilter<T>
    | InArrayFilter<T>
    | IsNullFilter<T>
    | IsNotNullFilter<T>
    | GTFilter<T>
    | GTEFilter<T>
    | LTFilter<T>
    | LTEFilter<T>;

export interface CommonFilterOptions<Entity> {
    field: keyof Entity;
}

/**
 * An `equals` filter passes only if the value is referentially equal to the filter value.
 */
export interface EqualsFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "equals";
}

/**
 * A `contains` filter passes when the string representation of the value
 * contains the string representation of the filter value.
 */
export interface ContainsFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "contains";
}

/**
 * An `inArray` filter passes when the value is contained within the filter value (which must be an array).
 */
export interface InArrayFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "inArray";
}

/**
 * An `isNull` filter passes when the value is null or undefined.
 */
export interface IsNullFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "isNull";
}

/**
 * An `isNotNull` filter passes when the value is not null and not undefined.
 */
export interface IsNotNullFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "isNotNull";
}

/**
 * A `gt` (greater than) filter passes when the value is greater than the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface GTFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "gt";
}

/**
 * A `gte` (greater than or equal) filter passes when the value is greater than or equal to the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface GTEFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "gte";
}

/**
 * An `lt` (less than) filter passes when the value is less than the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface LTFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "lt";
}

/**
 * An `lte` (less than or equal) filter passes when the value is less than or equal to the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface LTEFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "lte";
}

// -[ Boolean Filters ]------------------------------------------

export type BooleanFilter<Entity> = AndFilter<Entity> | OrFilter<Entity>;

export interface AndFilter<Entity> {
    kind: "and";
    conditions: [PrimitiveFilter<Entity>, ...PrimitiveFilter<Entity>[]];
}

export interface OrFilter<Entity> {
    kind: "or";
    conditions: [PrimitiveFilter<Entity>, ...PrimitiveFilter<Entity>[]];
}

// -[ Custom Filters ]-------------------------------------------

export type CustomFilter<Entity, Input> = (
    entity: Entity,
    input: Input,
) => boolean;

// ----------------------------------------------------------------
// Filter input
// ----------------------------------------------------------------

/**
 * The expected input for a Filter.
 *
 * ```typescript
 * const userFilter = entity<User>().filterDef({ ... });
 * type UserFilterInput = FilterInput<typeof userFilter>;
 * ````
 */
export type FilterInput<TFilter> =
    TFilter extends Filter<infer TEntity, infer TFilterDef>
        ? FilterDefInput<TEntity, TFilterDef>
        : never;

/**
 * Given an Entity and a FiltersDef, create
 */
export type FilterDefInput<Entity, TFilterDef extends FilterDef<Entity>> = {
    [K in keyof TFilterDef]?: FilterFieldInput<Entity, TFilterDef[K]>;
};

/**
 * A map of filter types to their expected input.
 *
 * A note on the Entity[Extract<...>] pattern:
 * - `Extract<TFilterDef, EqualsFilterDef<Entity>>`: narrow the generic TFilterDef type
 *   to ensure it matches the specific filter def type.
 * - `['field']`: accesses the field name from that definition
 * - `Entity[...]`: looks up the actual type of that field on the entity
 */
type FilterInputMap<Entity, TFilterField extends FilterField<Entity>> = {
    equals: Entity[Extract<TFilterField, EqualsFilter<Entity>>["field"]];
    contains: string;
    inArray: Entity[Extract<TFilterField, InArrayFilter<Entity>>["field"]][];
    isNull: boolean;
    isNotNull: boolean;
    gt: Entity[Extract<TFilterField, GTFilter<Entity>>["field"]];
    gte: Entity[Extract<TFilterField, GTEFilter<Entity>>["field"]];
    lt: Entity[Extract<TFilterField, LTFilter<Entity>>["field"]];
    lte: Entity[Extract<TFilterField, LTEFilter<Entity>>["field"]];
    and: FilterFieldInput<
        Entity,
        Extract<TFilterField, AndFilter<Entity>>["conditions"][number]
    >;
    or: FilterFieldInput<
        Entity,
        Extract<TFilterField, OrFilter<Entity>>["conditions"][number]
    >;
};

export type FilterFieldInput<Entity, TFilterField extends FilterField<Entity>> =
    // Primitive and Boolean Filters
    TFilterField extends {
        kind: infer K extends keyof FilterInputMap<Entity, TFilterField>;
    }
        ? FilterInputMap<Entity, TFilterField>[K] | undefined
        : // Custom Filters
          TFilterField extends CustomFilter<Entity, infer TArg>
          ? TArg
          : never;

// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

export type Filter<Entity, TFilterDef extends FilterDef<Entity>> = (
    filterInput: FilterDefInput<Entity, TFilterDef>,
) => (entity: Entity) => boolean;

/**
 * A compiled filter checker function that tests if an entity passes a filter.
 */
type CompiledFilterChecker<Entity> = (
    entity: Entity,
    filterValue: unknown,
) => boolean;

/**
 * Pre-compiles a primitive filter definition into an optimized checker function.
 */
const compilePrimitiveFilter = <Entity>(
    filterDef: PrimitiveFilter<Entity>,
): CompiledFilterChecker<Entity> => {
    const field = filterDef.field;

    switch (filterDef.kind) {
        case "equals":
            return (entity, filterValue) => entity[field] === filterValue;

        case "contains":
            return (entity, filterValue) =>
                String(entity[field]).includes(String(filterValue));

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
            filterDef satisfies never;
            return () => false;
    }
};

/**
 * Pre-compiles a boolean filter definition into an optimized checker function.
 */
const compileBooleanFilter = <Entity>(
    filterDef: BooleanFilter<Entity>,
): CompiledFilterChecker<Entity> => {
    const compiledConditions = filterDef.conditions.map((condition) =>
        compilePrimitiveFilter(condition),
    );

    switch (filterDef.kind) {
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
 * Pre-compiles a filter definition into an optimized checker function.
 */
const compileFilter = <Entity>(
    filterDef: FilterField<Entity>,
): CompiledFilterChecker<Entity> => {
    if (typeof filterDef === "function") {
        return filterDef;
    }

    switch (filterDef.kind) {
        case "and":
        case "or":
            return compileBooleanFilter(filterDef);

        default:
            return compilePrimitiveFilter(filterDef);
    }
};

/**
 * Creates a function that filters entities based on the provided filter object.
 * This v2 implementation pre-compiles all filters for optimal performance.
 */
const filterFn = <Entity, TFilterDef extends FilterDef<Entity>>(
    filtersDef: TFilterDef,
): Filter<Entity, TFilterDef> => {
    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        checker: CompiledFilterChecker<Entity>;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        checker: compileFilter(filterDef),
    }));

    // Return the optimized filter function
    return (filterInput: FilterDefInput<Entity, TFilterDef>) =>
        (entity: Entity) => {
            // Check if entity passes ALL filters
            for (let i = 0; i < compiledFilters.length; i++) {
                const { key, checker } = compiledFilters[i];
                const filterValue =
                    filterInput[key as keyof typeof filterInput];

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
