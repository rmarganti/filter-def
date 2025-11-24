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
 *     name: { kind: 'eq', field: 'name' },
 *     email: { kind: 'eq', field: 'email' },
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
        filterDef: TFilterDef & ValidateFilterDef<Entity, TFilterDef>,
    ): Filter<Entity, Simplify<FilterDefInput<Entity, TFilterDef>>> =>
        compileFilterDef(filterDef);

    return { filterDef };
};

// ----------------------------------------------------------------
// Filter definitions
// ----------------------------------------------------------------

export type FilterDef<Entity> = Record<string, FilterField<Entity>>;

/**
 * Validates that filter keys without explicit field properties match entity fields.
 * Boolean filters (and/or) require all conditions to have explicit field properties.
 * Custom filters are always allowed regardless of key name.
 *
 * ```typescript
 * interface User {
 *     id: string;
 *     name: string;
 *     email: string;
 * }
 *
 * // VALID
 * entity<User>().filterDef({
 *     // `id` field is explicitly defined. It could also be omitted, since it matches the filter name.
 *     id: { kind: 'eq', field: 'id' },
 *
 *     // The `name` field wasn't explicitly defined, but it matches the filter name.
 *     name: { kind: 'eq' },
 *
 *     // Even though `emailContains` doesn't match the `User.email` field,
 *     // we provided the `field` property to explicitly.
 *     emailContains: { kind: 'contains', field: 'email' },
 *
 *     // Boolean filters require all conditions to have explicit fields
 *     eitherName: {
 *         kind: 'or',
 *         conditions: [
 *             { kind: 'eq', field: 'name' },
 *             { kind: 'eq', field: 'email' },
 *         ]
 *     },
 * });
 *
 * // INVALID
 * entity<User>().filterDef({
 *     // Even though `id` matches the `User.id` property, we tried
 *     // to explicitly specify a different, invalid field.
 *     id: { kind: 'eq', field: 'invalidField' },
 *
 *     // `firstName` isn't a property of `User`.
 *     firstName: { kind: 'eq' },
 *
 *     // Neither `emailContains` nor `invalidEmail` are valid User properties.
 *     emailContains: { kind: 'contains', field: 'invalidEmail' },
 *
 *     // Boolean filters with conditions missing explicit fields are invalid
 *     searchAnywhere: {
 *         kind: 'or',
 *         conditions: [
 *             { kind: 'contains', field: 'name' },
 *             { kind: 'contains' }, // Missing required field property
 *         ]
 *     },
 * });
 *
 * ```
 */
type ValidateFilterDef<Entity, TFilterDef> = {
    [K in keyof TFilterDef]: TFilterDef[K] extends { field: any }
        ? // Filters with explicit `field` are already restricted to valid fields.
          TFilterDef[K]
        : TFilterDef[K] extends {
                kind: "and" | "or";
                conditions: infer Conditions extends any[];
            }
          ? // Boolean filters: all conditions must have required field properties
            AllConditionsHaveRequiredFields<Conditions> extends true
              ? TFilterDef[K]
              : TypeError<"All conditions on boolean filters must specify a `field` property">
          : TFilterDef[K] extends (...args: any[]) => any
            ? // Custom filters do not rely on fields, so they are always valid.
              TFilterDef[K]
            : K extends keyof Entity
              ? // We otherwise require the filter key to be a valid field.
                TFilterDef[K]
              : // Everything else is invalid
                TypeError<"Filters must specify a valid `field` property or use a key that matches a valid entity field">;
};

/**
 * Helper type to recursively check if all conditions in an array have required field properties.
 */
type AllConditionsHaveRequiredFields<Conditions extends any[]> =
    Conditions extends [infer First, ...infer Rest]
        ? HasRequiredField<First> extends true
            ? Rest extends any[]
                ? AllConditionsHaveRequiredFields<Rest>
                : true
            : false
        : true;

/**
 * Helper type to check if a type has a required field property.
 */
type HasRequiredField<T> = T extends { field: keyof any } ? true : false;

/**
 * A single filter definition, ie. `{ kind: 'eq', field: 'email' }`
 */
export type FilterField<T> =
    | PrimitiveFilter<T>
    | BooleanFilter<T>
    | CustomFilter<T, any>;

// -[ Primitive Filters ]----------------------------------------

export type PrimitiveFilter<T> =
    | EqFilter<T>
    | NeqFilter<T>
    | ContainsFilter<T>
    | InArrayFilter<T>
    | IsNullFilter<T>
    | IsNotNullFilter<T>
    | GTFilter<T>
    | GTEFilter<T>
    | LTFilter<T>
    | LTEFilter<T>;

export interface CommonFilterOptions<Entity> {
    field?: keyof Entity;
}

/**
 * An `eq` (equals) filter passes only if the value is referentially equal to the filter value.
 */
export interface EqFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "eq";
}

/**
 * A `neq` (not equals) filter passes only if the value is not referentially equal to the filter value.
 */
export interface NeqFilter<Entity> extends CommonFilterOptions<Entity> {
    kind: "neq";
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

/**
 * A function that accepts an entity and determines if a specific, custom filter passes.
 */
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
 * ```
 */
export type FilterInput<TFilter> =
    TFilter extends Filter<infer _TEntity, infer TFilterInput>
        ? TFilterInput
        : never;

/**
 * The expected input for a FilterDef.
 */
export type FilterDefInput<Entity, TFilterDef extends FilterDef<Entity>> = {
    [K in keyof TFilterDef]?: FilterFieldInput<K, Entity, TFilterDef[K]>;
};

/**
 * Helper type to get the field for a filter, either from explicit field property or inferred from key.
 */
type GetFieldForFilter<
    K extends PropertyKey,
    Entity,
    TFilterField,
> = TFilterField extends { field: infer F extends keyof Entity }
    ? F
    : K extends keyof Entity
      ? K
      : never;

/**
 * A map of filter types to their expected input.
 *
 * A note on the Entity[Extract<...>] pattern:
 * - `Extract<TFilterDef, EqFilter<Entity>>`: narrow the generic TFilterDef type
 *   to ensure it matches the specific filter def type.
 * - `['field']`: accesses the field name from that definition (or uses the key if field is omitted)
 * - `Entity[...]`: looks up the actual type of that field on the entity
 */
type FilterInputMap<
    K extends PropertyKey,
    Entity,
    TFilterField extends FilterField<Entity>,
> = {
    eq: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, EqFilter<Entity>>
    >];
    neq: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, NeqFilter<Entity>>
    >];
    contains: string;
    inArray: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, InArrayFilter<Entity>>
    >][];
    isNull: boolean;
    isNotNull: boolean;
    gt: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, GTFilter<Entity>>
    >];
    gte: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, GTEFilter<Entity>>
    >];
    lt: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, LTFilter<Entity>>
    >];
    lte: Entity[GetFieldForFilter<
        K,
        Entity,
        Extract<TFilterField, LTEFilter<Entity>>
    >];
    and: FilterFieldInput<
        K,
        Entity,
        Extract<TFilterField, AndFilter<Entity>>["conditions"][number]
    >;
    or: FilterFieldInput<
        K,
        Entity,
        Extract<TFilterField, OrFilter<Entity>>["conditions"][number]
    >;
};

/**
 * The expected input shape for a single filter field.
 */
export type FilterFieldInput<
    K extends PropertyKey,
    Entity,
    TFilterField extends FilterField<Entity>,
> =
    // Primitive and Boolean Filters
    TFilterField extends {
        kind: infer Kind extends keyof FilterInputMap<K, Entity, TFilterField>;
    }
        ? FilterInputMap<K, Entity, TFilterField>[Kind] | undefined
        : // Custom Filters
          TFilterField extends CustomFilter<Entity, infer TArg>
          ? TArg
          : never;

// ----------------------------------------------------------------
// Filtering
// ----------------------------------------------------------------

/**
 * A higher-order function that accepts a filter input (ie. `{ name: 'Bob' }`)
 * and returns a function that determines if an entity passes the filter.
 */
export type Filter<Entity, TFilterInput> = (
    filterInput?: TFilterInput,
) => (entity: Entity) => boolean;

/**
 * Pre-compiles a filter definition into an optimized checker function.
 * This then returns a higher-order function that accepts a filter input
 * and returns a function that determines if an entity passes the filter.
 */
const compileFilterDef = <Entity, TFilterDef extends FilterDef<Entity>>(
    filtersDef: TFilterDef,
): Filter<Entity, FilterDefInput<Entity, TFilterDef>> => {
    // Pre-compile all filters at definition time
    // Use separate arrays to avoid object allocations
    const entries = Object.entries(filtersDef);
    const keys: string[] = [];
    const checkers: Array<CompiledFilterField<Entity>> = [];

    for (let i = 0; i < entries.length; i++) {
        const [key, filterDef] = entries[i];
        keys.push(key);
        checkers.push(compileFilterField(key, filterDef));
    }

    // Return the optimized filter function
    return (filterInput: FilterDefInput<Entity, TFilterDef> | undefined) =>
        (entity: Entity) => {
            if (!filterInput) {
                return true;
            }

            // Check if entity passes ALL filters
            for (let i = 0; i < keys.length; i++) {
                const filterValue =
                    filterInput[keys[i] as keyof typeof filterInput];

                // If no filter value provided, skip this filter (it passes)
                if (filterValue === undefined) {
                    continue;
                }

                // Use the pre-compiled checker
                if (!checkers[i](entity, filterValue)) {
                    return false;
                }
            }

            return true;
        };
};

/**
 * A compiled filter field checker function that tests if an entity passes a single filter.
 */
type CompiledFilterField<Entity> = (
    entity: Entity,
    filterValue: unknown,
) => boolean;

/**
 * Pre-compiles a filter field into an optimized checker function.
 */
const compileFilterField = <Entity>(
    key: string,
    filterField: FilterField<Entity>,
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
        // Boolean filter conditions must have explicit field property
        // TODO: Implement field property validation for Boolean filters.
        compilePrimitiveFilter(condition.field as string, condition),
    );

    switch (filterField.kind) {
        case "and": {
            // Manual loop for early exit optimization
            return (entity, filterValue) => {
                for (let i = 0; i < compiledConditions.length; i++) {
                    if (!compiledConditions[i](entity, filterValue)) {
                        return false;
                    }
                }
                return true;
            };
        }

        case "or": {
            // Manual loop for early exit optimization
            return (entity, filterValue) => {
                for (let i = 0; i < compiledConditions.length; i++) {
                    if (compiledConditions[i](entity, filterValue)) {
                        return true;
                    }
                }
                return false;
            };
        }
    }
};

/**
 * Helper to get numeric value, avoiding conversion if already a number
 */
const asNumber = (value: unknown): number =>
    typeof value === "number" ? value : Number(value);

/**
 * Helper to get string value, avoiding conversion if already a string
 */
const asString = (value: unknown): string =>
    typeof value === "string" ? value : String(value);

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
                const fieldStr = asString(entity[field]);
                const filterStr = asString(filterValue);
                return fieldStr.includes(filterStr);
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

        case "gt": {
            return (entity, filterValue) => {
                const fieldNum = asNumber(entity[field]);
                const filterNum = filterValue as number;
                return fieldNum > filterNum;
            };
        }

        case "gte": {
            return (entity, filterValue) => {
                const fieldNum = asNumber(entity[field]);
                const filterNum = filterValue as number;
                return fieldNum >= filterNum;
            };
        }

        case "lt": {
            return (entity, filterValue) => {
                const fieldNum = asNumber(entity[field]);
                const filterNum = filterValue as number;
                return fieldNum < filterNum;
            };
        }

        case "lte": {
            return (entity, filterValue) => {
                const fieldNum = asNumber(entity[field]);
                const filterNum = filterValue as number;
                return fieldNum <= filterNum;
            };
        }

        default:
            filterField satisfies never;
            return () => false;
    }
};

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

/**
 * Forces TypeScript to evaluate and display a type in a simplified form.
 * This improves the developer experience by showing resolved types in hovers/intellisense.
 */
type Simplify<T> = {
    [K in keyof T]: T[K];
} & {};

/**
 * Utility type to help expose more meaningful errors to consumers.
 */
type TypeError<T extends string> = `⚠️ TypeError: ${T}`;
