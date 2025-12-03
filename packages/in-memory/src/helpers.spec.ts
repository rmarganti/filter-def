import { describe, expect, it } from "vitest";
import { makeFilterHelpers } from "./helpers.ts";
import { inMemoryFilter } from "./in-memory-filter.ts";

interface User {
    id: number;
    name: string;
    age: number;
    isActive: boolean;
}

const users: Array<User> = [
    { id: 1, name: "Alice", age: 30, isActive: true },
    { id: 2, name: "Bob", age: 25, isActive: false },
    { id: 3, name: "Charlie", age: 35, isActive: true },
    { id: 4, name: "Diana", age: 25, isActive: true },
];

const userFilter = inMemoryFilter<User>().def({
    id: { kind: "eq" },
    minAge: { kind: "gte", field: "age" },
    isActive: { kind: "eq" },
});

const {
    filter: filterUsers,
    find: findUser,
    findIndex: findUserIndex,
    some: someUsers,
    every: everyUser,
} = makeFilterHelpers(userFilter);

describe("makeFilterHelpers", () => {
    describe("filter", () => {
        it("should filter entities by single criterion", () => {
            const result = filterUsers(users, { id: 2 });

            expect(result).toEqual([users[1]]);
        });

        it("should filter entities by multiple criteria", () => {
            const result = filterUsers(users, { minAge: 30, isActive: true });

            expect(result).toEqual([users[0], users[2]]);
        });

        it("should return all entities when no filter input provided", () => {
            const result = filterUsers(users);

            expect(result).toEqual(users);
        });

        it("should return empty array when no matches", () => {
            const result = filterUsers(users, { id: 999 });

            expect(result).toEqual([]);
        });
    });

    describe("find", () => {
        it("should find first matching entity", () => {
            const result = findUser(users, { minAge: 25 });

            expect(result).toEqual(users[0]);
        });

        it("should return undefined when no match", () => {
            const result = findUser(users, { id: 999 });

            expect(result).toBeUndefined();
        });

        it("should return first entity when no filter input provided", () => {
            const result = findUser(users);

            expect(result).toEqual(users[0]);
        });
    });

    describe("findIndex", () => {
        it("should find index of first matching entity", () => {
            const result = findUserIndex(users, { id: 3 });

            expect(result).toBe(2);
        });

        it("should return -1 when no match", () => {
            const result = findUserIndex(users, { id: 999 });

            expect(result).toBe(-1);
        });

        it("should return 0 when no filter input provided", () => {
            const result = findUserIndex(users);

            expect(result).toBe(0);
        });
    });

    describe("some", () => {
        it("should return true when at least one entity matches", () => {
            const result = someUsers(users, { minAge: 35 });

            expect(result).toBe(true);
        });

        it("should return false when no entities match", () => {
            const result = someUsers(users, { id: 999 });

            expect(result).toBe(false);
        });

        it("should return true when array not empty and no filter input", () => {
            const result = someUsers(users);

            expect(result).toBe(true);
        });

        it("should return false when array is empty", () => {
            const result = someUsers([]);

            expect(result).toBe(false);
        });
    });

    describe("every", () => {
        it("should return true when all entities match", () => {
            const result = everyUser(users, { minAge: 25 });

            expect(result).toBe(true);
        });

        it("should return false when not all entities match", () => {
            const result = everyUser(users, { isActive: true });

            expect(result).toBe(false);
        });

        it("should return true when array is empty", () => {
            const result = everyUser([], { id: 1 });

            expect(result).toBe(true);
        });

        it("should return true when array not empty and no filter input", () => {
            const result = everyUser(users);

            expect(result).toBe(true);
        });
    });
});
