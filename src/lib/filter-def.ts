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
export const entity = <TEntity>() => {
    const filterDef = <TFiltersDef extends FiltersDef<TEntity>>(
        FiltersDef: TFiltersDef,
    ): PredicateCreator<TEntity, TFiltersDef> => filterFn(FiltersDef);

    return { filterDef };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

type FiltersDef<TEntity> = Record<string, FilterDef<TEntity>>;

/**
 * A single filter definition, ie. `{ kind: 'equals', field: 'email' }`
 */
export type FilterDef<T> =
    | PrimitiveFilterDef<T>
    | BooleanFilterDef<T>
    | CustomFilterDef<T, any>;

// -[ Primitive Filters ]----------------------------------------

export type PrimitiveFilterDef<T> =
    | EqualsFilterDef<T>
    | ContainsFilterDef<T>
    | InArrayFilterDef<T>
    | IsNullFilterDef<T>
    | IsNotNullFilterDef<T>
    | GTFilterDef<T>
    | GTEFilterDef<T>
    | LTFilterDef<T>
    | LTEFilterDef<T>;

export interface CommonFilterOptions<TEntity> {
    field: keyof TEntity;
}

/**
 * An `equals` filter passes only if the value is referentially equal to the filter value.
 */
export interface EqualsFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "equals";
}

/**
 * A `contains` filter passes when the string representation of the value
 * contains the string representation of the filter value.
 */
export interface ContainsFilterDef<TEntity>
    extends CommonFilterOptions<TEntity> {
    kind: "contains";
}

/**
 * An `inArray` filter passes when the value is contained within the filter value (which must be an array).
 */
export interface InArrayFilterDef<TEntity>
    extends CommonFilterOptions<TEntity> {
    kind: "inArray";
}

/**
 * An `isNull` filter passes when the value is null or undefined.
 */
export interface IsNullFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "isNull";
}

/**
 * An `isNotNull` filter passes when the value is not null and not undefined.
 */
export interface IsNotNullFilterDef<TEntity>
    extends CommonFilterOptions<TEntity> {
    kind: "isNotNull";
}

/**
 * A `gt` (greater than) filter passes when the value is greater than the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface GTFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "gt";
}

/**
 * A `gte` (greater than or equal) filter passes when the value is greater than or equal to the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface GTEFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "gte";
}

/**
 * An `lt` (less than) filter passes when the value is less than the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface LTFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "lt";
}

/**
 * An `lte` (less than or equal) filter passes when the value is less than or equal to the filter value.
 * Works with any comparable data type (numbers, strings, dates, etc.).
 */
export interface LTEFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "lte";
}

// -[ Boolean Filters ]------------------------------------------

export type BooleanFilterDef<TEntity> =
    | AndFilterDef<TEntity>
    | OrFilterDef<TEntity>;

export interface AndFilterDef<TEntity> {
    kind: "and";
    conditions: [PrimitiveFilterDef<TEntity>, ...PrimitiveFilterDef<TEntity>[]];
}

export interface OrFilterDef<TEntity> {
    kind: "or";
    conditions: [PrimitiveFilterDef<TEntity>, ...PrimitiveFilterDef<TEntity>[]];
}

// -[ Custom Filters ]-------------------------------------------

export type CustomFilterDef<TEntity, TInput> = (
    entity: TEntity,
    input: TInput,
) => boolean;

// ----------------------------------------------------------------
// Filter input
// ----------------------------------------------------------------

export type InputForPredicateCreator<TPredicateCreator> =
    TPredicateCreator extends PredicateCreator<infer TEntity, infer TFiltersDef>
        ? InputForFiltersDef<TEntity, TFiltersDef>
        : never;

/**
 * Given an Entity and a FiltersDef, create
 */
export type InputForFiltersDef<
    Entity,
    TFiltersDef extends FiltersDef<Entity>,
> = {
    [K in keyof TFiltersDef]?: InputForFilterDef<Entity, TFiltersDef[K]>;
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
type FilterInputMap<Entity, TFilterDef extends FilterDef<Entity>> = {
    equals: Entity[Extract<TFilterDef, EqualsFilterDef<Entity>>["field"]];
    contains: string;
    inArray: Entity[Extract<TFilterDef, InArrayFilterDef<Entity>>["field"]][];
    isNull: boolean;
    isNotNull: boolean;
    gt: Entity[Extract<TFilterDef, GTFilterDef<Entity>>["field"]];
    gte: Entity[Extract<TFilterDef, GTEFilterDef<Entity>>["field"]];
    lt: Entity[Extract<TFilterDef, LTFilterDef<Entity>>["field"]];
    lte: Entity[Extract<TFilterDef, LTEFilterDef<Entity>>["field"]];
    and: InputForFilterDef<
        Entity,
        Extract<TFilterDef, AndFilterDef<Entity>>["conditions"][number]
    >;
    or: InputForFilterDef<
        Entity,
        Extract<TFilterDef, OrFilterDef<Entity>>["conditions"][number]
    >;
};

export type InputForFilterDef<Entity, TFilterDef extends FilterDef<Entity>> =
    // Primitive and Boolean Filters
    TFilterDef extends {
        kind: infer K extends keyof FilterInputMap<Entity, TFilterDef>;
    }
        ? FilterInputMap<Entity, TFilterDef>[K] | undefined
        : // Custom Filters
          TFilterDef extends CustomFilterDef<Entity, infer TArg>
          ? TArg
          : never;

// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

export type PredicateCreator<Entity, TFiltersDef extends FiltersDef<Entity>> = (
    filterInput: InputForFiltersDef<Entity, TFiltersDef>,
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
    filterDef: PrimitiveFilterDef<Entity>,
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
    filterDef: BooleanFilterDef<Entity>,
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
    filterDef: FilterDef<Entity>,
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
const filterFn = <TEntity, TFiltersDef extends FiltersDef<TEntity>>(
    filtersDef: TFiltersDef,
): PredicateCreator<TEntity, TFiltersDef> => {
    // Pre-compile all filters at definition time
    const compiledFilters: Array<{
        key: string;
        checker: CompiledFilterChecker<TEntity>;
    }> = Object.entries(filtersDef).map(([key, filterDef]) => ({
        key,
        checker: compileFilter(filterDef),
    }));

    // Return the optimized filter function
    return (filterInput: InputForFiltersDef<TEntity, TFiltersDef>) =>
        (entity: TEntity) => {
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
