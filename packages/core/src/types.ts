// ----------------------------------------------------------------
// Core Filters
// ----------------------------------------------------------------

/**
 * The filter types supported by all adapters. This is essentially all filters
 * other than custom filters, which are implementation-specific.
 */
export type CoreFilter<Entity> =
    | PrimitiveFilter<Entity>
    | BooleanFilter<Entity>;

/**
 * Union type of all filter kinds.
 */
export type CoreFilterKind = PrimitiveFilterKind | BooleanFilterKind;

// -[ Primitive Filters ]----------------------------------------

/**
 * Union type of all primitive filter kinds.
 */
export type PrimitiveFilterKind = PrimitiveFilter<unknown>["kind"];

/**
 * All core primitive filters.
 */
export type PrimitiveFilter<Entity> =
    | EqFilter<Entity>
    | NeqFilter<Entity>
    | ContainsFilter<Entity>
    | InArrayFilter<Entity>
    | IsNullFilter<Entity>
    | IsNotNullFilter<Entity>
    | GTFilter<Entity>
    | GTEFilter<Entity>
    | LTFilter<Entity>
    | LTEFilter<Entity>;

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
    caseInsensitive?: boolean;
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

/**
 * Union type of all boolean filter kinds.
 */
export type BooleanFilterKind = BooleanFilter<unknown>["kind"];

/**
 * All core boolean filters.
 */
export type BooleanFilter<Entity> = AndFilter<Entity> | OrFilter<Entity>;

/**
 * An `and` filter requires that ALL of its conditions be met.
 */
export interface AndFilter<Entity> {
    kind: "and";
    conditions: [PrimitiveFilter<Entity>, ...PrimitiveFilter<Entity>[]];
}

/**
 * An `or` filter requires that AT LEAST ONE of its conditions be met.
 */
export interface OrFilter<Entity> {
    kind: "or";
    conditions: [PrimitiveFilter<Entity>, ...PrimitiveFilter<Entity>[]];
}

/**
 * A universal filter field that works with all implementations (in-memory, drizzle, etc).
 */
export type CoreFilterField<Entity> =
    | PrimitiveFilter<Entity>
    | BooleanFilter<Entity>;

/**
 * Filter definition type for core filter types. This definition only supports
 * filter fields that are universal and not implementation specific.
 */
export type CoreFilterDef<Entity> = Record<string, CoreFilterField<Entity>>;

// ----------------------------------------------------------------
// Input types
// ----------------------------------------------------------------

/**
 * A map of filter types to their expected input.
 *
 * A note on the Entity[Extract<...>] pattern:
 * - `Extract<TFilterDef, EqFilter<Entity>>`: narrow the generic TFilterDef type
 *   to ensure it matches the specific filter def type.
 * - `['field']`: accesses the field name from that definition (or uses the key if field is omitted)
 * - `Entity[...]`: looks up the actual type of that field on the entity
 */
type CoreFilterInputMap<
    K extends PropertyKey,
    Entity,
    TFilterField extends CoreFilter<Entity>,
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
    and: CoreFilterInput<
        K,
        Entity,
        Extract<TFilterField, AndFilter<Entity>>["conditions"][number]
    >;
    or: CoreFilterInput<
        K,
        Entity,
        Extract<TFilterField, OrFilter<Entity>>["conditions"][number]
    >;
};

export type CoreFilterInput<
    K extends PropertyKey,
    Entity,
    TFilterField extends CoreFilter<Entity>,
> = TFilterField extends {
    kind: infer Kind extends keyof CoreFilterInputMap<K, Entity, TFilterField>;
}
    ? CoreFilterInputMap<K, Entity, TFilterField>[Kind] | undefined
    : never;

// ----------------------------------------------------------------
// Validation types
// ----------------------------------------------------------------

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
 * inMemoryFilter<User>().filterDef({
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
 * inMemoryFilter<User>().filterDef({
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
export type ValidateFilterDef<Entity, TFilterDef> = {
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

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

/**
 * Forces TypeScript to evaluate and display a type in a simplified form.
 * This improves the developer experience by showing resolved types in hovers/intellisense.
 */
export type Simplify<T> = {
    [K in keyof T]: T[K];
} & {};

/**
 * Utility type to help expose more meaningful errors to consumers.
 */
export type TypeError<T extends string> = `⚠️ TypeError: ${T}`;

/**
 * Helper type to get the field for a filter, either from explicit field property or inferred from key.
 * Useful for adapter authors to determine which entity field a filter targets.
 */
export type GetFieldForFilter<
    K extends PropertyKey,
    Entity,
    TFilterField,
> = TFilterField extends { field: infer F extends keyof Entity }
    ? F
    : K extends keyof Entity
      ? K
      : never;
