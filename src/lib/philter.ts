export const entity = <EntityShape>() => {
    const philter = <FilterObj extends FilterObjForEntity<EntityShape>>(
        filterObj: FilterObj,
    ): FilterFn<EntityShape, FilterObj> => filterFn(filterObj);

    return { philter };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

type FilterObjForEntity<T> = Record<string, FilterForEntity<T>>;

export type FilterForEntity<T> =
    | EqualsFilterDef<T>
    | ContainsFilterDef<T>
    | InArrayFilterDef<T>;

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
 * A `contains` filter passes when the value contains the filter value.
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

// ----------------------------------------------------------------
// Filter input
// ----------------------------------------------------------------

type InputForFilterObj<
    EntityShape,
    FilterObj extends FilterObjForEntity<EntityShape>,
> = {
    [K in keyof FilterObj]?: InputForFilterShape<EntityShape, FilterObj[K]>;
};

type InputForFilterShape<Entity, Filter extends FilterForEntity<any>> =
    Filter extends EqualsFilterDef<Entity>
        ? Entity[Filter["field"]] | undefined
        : Filter extends ContainsFilterDef<Entity>
          ? string | undefined
          : Filter extends InArrayFilterDef<Entity>
            ? Entity[Filter["field"]][] | undefined
            : never;

// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

export type FilterFn<
    EntityShape,
    FilterObj extends FilterObjForEntity<EntityShape>,
> = (
    entities: EntityShape[],
    filterInput: InputForFilterObj<EntityShape, FilterObj>,
) => EntityShape[];

/**
 * Creates a function that filters entities based on the provided filter object.
 */
const filterFn =
    <EntityShape, FilterObj extends FilterObjForEntity<EntityShape>>(
        filterObj: FilterObj,
    ): FilterFn<EntityShape, FilterObj> =>
    (
        entities: EntityShape[],
        filterInput: InputForFilterObj<EntityShape, FilterObj>,
    ) => {
        return entities.filter((entity) => {
            // Check if entity passes ALL filters
            return Object.entries(filterObj).every(([filterKey, filterDef]) => {
                const filterValue =
                    filterInput[filterKey as keyof typeof filterInput];

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
                }

                return true;
            });
        });
    };
