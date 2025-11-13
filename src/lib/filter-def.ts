export const entity = <TEntity>() => {
    const filterDef = <TFiltersDef extends FiltersDef<TEntity>>(
        FiltersDef: TFiltersDef,
    ): FilterFn<TEntity, TFiltersDef> => filterFn(FiltersDef);

    return { filterDef };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

type FiltersDef<TEntity> = Record<string, FilterDef<TEntity>>;

/**
 * A single filter definition, ie. `{ kind: 'equals', field: 'email' }`
 */
export type FilterDef<T> = PrimitiveFilterDef<T> | BooleanFilterDef<T>;

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

// -[ Primitive Filters ]----------------------------------------

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
 */
export interface GTFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "gt";
}

/**
 * A `gte` (greater than or equal) filter passes when the value is greater than or equal to the filter value.
 */
export interface GTEFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "gte";
}

/**
 * An `lt` (less than) filter passes when the value is less than the filter value.
 */
export interface LTFilterDef<TEntity> extends CommonFilterOptions<TEntity> {
    kind: "lt";
}

/**
 * An `lte` (less than or equal) filter passes when the value is less than or equal to the filter value.
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

// ----------------------------------------------------------------
// Filter input
// ----------------------------------------------------------------

/**
 * Given an Entity and a FiltersDef, create
 */
type InputForFiltersDef<Entity, TFiltersDef extends FiltersDef<Entity>> = {
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

export type InputForFilterDef<
    Entity,
    TFilterDef extends FilterDef<Entity>,
> = TFilterDef extends {
    kind: infer K extends keyof FilterInputMap<Entity, TFilterDef>;
}
    ? FilterInputMap<Entity, TFilterDef>[K] | undefined
    : never;

// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

export type FilterFn<Entity, TFiltersDef extends FiltersDef<Entity>> = (
    entities: Entity[],
    filterInput: InputForFiltersDef<Entity, TFiltersDef>,
) => Entity[];

/**
 * Creates a function that filters entities based on the provided filter object.
 */
const filterFn =
    <Entity, TFiltersDef extends FiltersDef<Entity>>(
        filtersDef: TFiltersDef,
    ): FilterFn<Entity, TFiltersDef> =>
    (
        entities: Entity[],
        filterInput: InputForFiltersDef<Entity, TFiltersDef>,
    ) => {
        return entities.filter((entity) => {
            // Check if entity passes ALL filters
            return Object.entries(filtersDef).every(
                ([filterKey, filterDef]) => {
                    const filterValue =
                        filterInput[filterKey as keyof typeof filterInput];

                    // If no filter value provided, skip this filter (it passes)
                    if (filterValue === undefined) {
                        return true;
                    }

                    switch (filterDef.kind) {
                        case "and":
                        case "or":
                            return booleanFilterPasses(
                                entity,
                                filterDef,
                                filterValue,
                            );

                        default:
                            return primitiveFilterPasses(
                                entity,
                                filterDef,
                                filterValue,
                            );
                    }
                },
            );
        });
    };

const booleanFilterPasses = <Entity>(
    entity: Entity,
    filterDef: BooleanFilterDef<Entity>,
    filterValue: unknown, // We've already narrowed the type in calling functions
): boolean => {
    switch (filterDef.kind) {
        case "and":
            return filterDef.conditions.every((condition) =>
                primitiveFilterPasses(entity, condition, filterValue),
            );

        case "or":
            return filterDef.conditions.some((condition) =>
                primitiveFilterPasses(entity, condition, filterValue),
            );
    }
};

/**
 * Checks if an entity passes a primitive filter.
 */
const primitiveFilterPasses = <Entity>(
    entity: Entity,
    filterDef: PrimitiveFilterDef<Entity>,
    filterValue: unknown, // We've already narrowed the type in calling functions
): boolean => {
    // If no filter value provided, skip this filter (it passes)
    if (filterValue === undefined) {
        return true;
    }

    const fieldValue = entity[filterDef.field];

    switch (filterDef.kind) {
        case "equals":
            return fieldValue === filterValue;

        case "contains":
            return String(fieldValue).includes(String(filterValue));

        case "inArray":
            return (filterValue as unknown[]).includes(fieldValue);

        case "isNull":
            return filterValue ? fieldValue == null : fieldValue != null;

        case "isNotNull":
            return filterValue ? fieldValue != null : fieldValue == null;

        case "gt":
            return Number(fieldValue) > (filterValue as number);

        case "gte":
            return Number(fieldValue) >= (filterValue as number);

        case "lt":
            return Number(fieldValue) < (filterValue as number);

        case "lte":
            return Number(fieldValue) <= (filterValue as number);

        default:
            filterDef satisfies never;
            return false;
    }
};
