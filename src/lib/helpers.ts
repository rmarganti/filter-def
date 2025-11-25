import type { Filter } from "./filter-def.ts";

export interface FilterHelpers<TEntity, TFilterInput> {
    filter: (entities: TEntity[], filterInput?: TFilterInput) => TEntity[];

    find: (
        entities: TEntity[],
        filterInput?: TFilterInput,
    ) => TEntity | undefined;

    findIndex: (
        entities: TEntity[],
        filterInput?: TFilterInput,
    ) => number | undefined;

    some: (entities: TEntity[], filterInput?: TFilterInput) => boolean;

    every: (entities: TEntity[], filterInput?: TFilterInput) => boolean;
}

/**
 * Creates a set of filter helpers for a given filter function.
 *
 * ```typescript
 * const userFilter = entity<User>().filterDef({
 *   id: { kind: 'eq' },
 *   olderThan: { kind: 'gt', field: 'age },
 * });
 *
 * const {
 *   filter: filterUsers,
 *   find: findUser,
 *   some: someUsers,
 *   every: everyUsers,
 * } = makeFilterHelpers(userFilter);
 * ```
 */
export const makeFilterHelpers = <TEntity, TFilterInput>(
    filter: Filter<TEntity, TFilterInput>,
): FilterHelpers<TEntity, TFilterInput> => ({
    filter: (entities: TEntity[], filterInput?: TFilterInput) =>
        entities.filter(filter(filterInput)),

    find: (entities: TEntity[], filterInput?: TFilterInput) =>
        entities.find(filter(filterInput)),

    findIndex: (entities: TEntity[], filterInput?: TFilterInput) =>
        entities.findIndex(filter(filterInput)),

    some: (entities: TEntity[], filterInput?: TFilterInput) =>
        entities.some(filter(filterInput)),

    every: (entities: TEntity[], filterInput?: TFilterInput) =>
        entities.every(filter(filterInput)),
});
