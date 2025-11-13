export const entity = <EntityShape>() => {
    const philter = <FiltersDef extends FiltersDefForEntity<EntityShape>>(
        FiltersDef: FiltersDef,
    ): FilterFn<EntityShape, FiltersDef> => filterFn(FiltersDef);

    return { philter };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

type FiltersDefForEntity<T> = Record<string, FilterForEntity<T>>;

/**
 * A single filter definition, ie. `{ kind: 'equals', field: 'email' }`
 */
export type FilterForEntity<T> = PrimitiveFilterDef<T> | BooleanFilterDef<T>;

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

export interface CommonFilterOptions<T> {
    field: keyof T;
}

/**
 * An `equals` filter passes only if the value is referentially equal to the filter value.
 */
export interface EqualsFilterDef<T> extends CommonFilterOptions<T> {
    kind: "equals";
}

/**
 * A `contains` filter passes when the string representation of the value
 * contains the string representation of the filter value.
 */
export interface ContainsFilterDef<T> extends CommonFilterOptions<T> {
    kind: "contains";
}

/**
 * An `inArray` filter passes when the value is contained within the filter value (which must be an array).
 */
export interface InArrayFilterDef<T> extends CommonFilterOptions<T> {
    kind: "inArray";
}

/**
 * An `isNull` filter passes when the value is null or undefined.
 */
export interface IsNullFilterDef<T> extends CommonFilterOptions<T> {
    kind: "isNull";
}

/**
 * An `isNotNull` filter passes when the value is not null and not undefined.
 */
export interface IsNotNullFilterDef<T> extends CommonFilterOptions<T> {
    kind: "isNotNull";
}

/**
 * A `gt` (greater than) filter passes when the value is greater than the filter value.
 */
export interface GTFilterDef<T> extends CommonFilterOptions<T> {
    kind: "gt";
}

/**
 * A `gte` (greater than or equal) filter passes when the value is greater than or equal to the filter value.
 */
export interface GTEFilterDef<T> extends CommonFilterOptions<T> {
    kind: "gte";
}

/**
 * An `lt` (less than) filter passes when the value is less than the filter value.
 */
export interface LTFilterDef<T> extends CommonFilterOptions<T> {
    kind: "lt";
}

/**
 * An `lte` (less than or equal) filter passes when the value is less than or equal to the filter value.
 */
export interface LTEFilterDef<T> extends CommonFilterOptions<T> {
    kind: "lte";
}

// -[ Boolean Filters ]------------------------------------------

export type BooleanFilterDef<T> = AndFilterDef<T> | OrFilterDef<T>;

export interface AndFilterDef<T> {
    kind: "and";
    conditions: [PrimitiveFilterDef<T>, ...PrimitiveFilterDef<T>[]];
}

export interface OrFilterDef<T> {
    kind: "or";
    conditions: [PrimitiveFilterDef<T>, ...PrimitiveFilterDef<T>[]];
}

// ----------------------------------------------------------------
// Filter input
// ----------------------------------------------------------------

/**
 * Given an EntityShape and a FiltersDef, create
 */
type InputForFiltersDef<
    EntityShape,
    FiltersDef extends FiltersDefForEntity<EntityShape>,
> = {
    [K in keyof FiltersDef]?: InputForFilterShape<EntityShape, FiltersDef[K]>;
};

type InputForFilterShape<Entity, Filter extends FilterForEntity<never>> =
    Filter extends EqualsFilterDef<Entity>
        ? Entity[Filter["field"]] | undefined
        : Filter extends ContainsFilterDef<Entity>
          ? string | undefined
          : Filter extends InArrayFilterDef<Entity>
            ? Entity[Filter["field"]][] | undefined
            : Filter extends IsNullFilterDef<Entity>
              ? boolean | undefined
              : Filter extends IsNotNullFilterDef<Entity>
                ? boolean | undefined
                : Filter extends GTFilterDef<Entity>
                  ? number | undefined
                  : Filter extends GTEFilterDef<Entity>
                    ? number | undefined
                    : Filter extends LTFilterDef<Entity>
                      ? number | undefined
                      : Filter extends LTEFilterDef<Entity>
                        ? number | undefined
                        : Filter extends AndFilterDef<Entity>
                          ?
                                | InputForFilterShape<
                                      Entity,
                                      Filter["conditions"][number]
                                  >
                                | undefined
                          : Filter extends OrFilterDef<Entity>
                            ?
                                  | InputForFilterShape<
                                        Entity,
                                        Filter["conditions"][number]
                                    >
                                  | undefined
                            : never;
// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

export type FilterFn<
    EntityShape,
    FiltersDef extends FiltersDefForEntity<EntityShape>,
> = (
    entities: EntityShape[],
    filterInput: InputForFiltersDef<EntityShape, FiltersDef>,
) => EntityShape[];

/**
 * Creates a function that filters entities based on the provided filter object.
 */
const filterFn =
    <EntityShape, FiltersDef extends FiltersDefForEntity<EntityShape>>(
        FiltersDef: FiltersDef,
    ): FilterFn<EntityShape, FiltersDef> =>
    (
        entities: EntityShape[],
        filterInput: InputForFiltersDef<EntityShape, FiltersDef>,
    ) => {
        return entities.filter((entity) => {
            // Check if entity passes ALL filters
            return Object.entries(FiltersDef).every(
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

const booleanFilterPasses = <EntityShape>(
    entity: EntityShape,
    filterDef: BooleanFilterDef<EntityShape>,
    filterValue: any, // We've already narrowed the type in calling functions
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
const primitiveFilterPasses = <EntityShape>(
    entity: EntityShape,
    filterDef: PrimitiveFilterDef<EntityShape>,
    filterValue: any, // We've already narrowed the type in calling functions
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
            return (filterValue as any[]).includes(fieldValue);

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
