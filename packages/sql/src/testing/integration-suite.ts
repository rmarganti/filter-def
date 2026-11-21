import { describe, expect, expectTypeOf, it } from "vitest";
import type { SqlFragment } from "../fragment.ts";
import type { SqlFilterFactory, SqlFilterInput } from "../sql-filter.ts";

// ----------------------------------------------------------------
// Shared fixture
// ----------------------------------------------------------------

export interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    phone: string | null;
    isActive: number;
    score: number;
    /** Reserved word, to prove identifiers are quoted. */
    order: number;
}

export const exampleUsers: User[] = [
    {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        phone: "555-1234",
        isActive: 1,
        score: 85,
        order: 3,
    },
    {
        id: 2,
        name: "Jane Doe",
        email: "jane@example.com",
        age: 25,
        phone: null,
        isActive: 1,
        score: 92,
        order: 1,
    },
    {
        id: 3,
        name: "Bob Smith",
        email: "bob_smith@smith.org",
        age: 40,
        phone: "555-5678",
        isActive: 0,
        score: 78,
        order: 2,
    },
    {
        id: 4,
        name: "Alice Johnson",
        email: "alice@example.com",
        age: 28,
        phone: "555-9012",
        isActive: 1,
        score: 88,
        order: 4,
    },
];

/**
 * Column `isActive` is stored as `is_active` to exercise the `columns` option.
 */
export const COLUMNS = { isActive: "is_active" } as const;

interface IntegrationSuiteOptions {
    sqlFilter: SqlFilterFactory;

    /**
     * Runs `SELECT id FROM users WHERE <where>` with at least one parameter
     * before and after `where`, and returns matching ids in id order.
     */
    selectIds: (where: SqlFragment) => Promise<number[]>;

    /** Whether plain LIKE is case-sensitive (false for MySQL's default collation). */
    caseSensitiveLike: boolean;

    /** `id = 1 OR id = 2`, built with the dialect's `sql` tag. */
    idOneOrTwo: SqlFragment;
}

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------

/**
 * Runs the same behavior checks against a real database.
 */
export const runIntegrationSuite = ({
    sqlFilter,
    selectIds,
    caseSensitiveLike,
    idOneOrTwo,
}: IntegrationSuiteOptions) => {
    const userFilter = sqlFilter<User>({ columns: COLUMNS }).def({
        id: { kind: "eq" },
        name: { kind: "eq" },
        nameNot: { kind: "neq", field: "name" },
        nameContains: { kind: "contains", field: "name" },
        nameContainsCi: {
            kind: "contains",
            field: "name",
            caseInsensitive: true,
        },
        emailContains: { kind: "contains", field: "email" },
        ageIn: { kind: "inArray", field: "age" },
        phoneIsNull: { kind: "isNull", field: "phone" },
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
        minAge: { kind: "gte", field: "age" },
        maxAge: { kind: "lte", field: "age" },
        olderThan: { kind: "gt", field: "age" },
        youngerThan: { kind: "lt", field: "age" },
        isActive: { kind: "eq" },
        order: { kind: "eq" },
        ageRange: {
            kind: "and",
            conditions: [
                { kind: "gte", field: "age" },
                { kind: "lte", field: "age" },
            ],
        },
        search: {
            kind: "or",
            conditions: [
                { kind: "contains", field: "name" },
                { kind: "contains", field: "email" },
            ],
        },
    });

    const run = (input?: SqlFilterInput<typeof userFilter>) =>
        selectIds(userFilter(input));

    describe("empty input", () => {
        it("matches every row when input is undefined", async () => {
            expect(await run()).toEqual([1, 2, 3, 4]);
        });

        it("matches every row when every value is undefined", async () => {
            expect(await run({ name: undefined })).toEqual([1, 2, 3, 4]);
        });
    });

    describe("primitive filters", () => {
        it("eq", async () => {
            expect(await run({ name: "Jane Doe" })).toEqual([2]);
        });

        it("neq", async () => {
            expect(await run({ nameNot: "Jane Doe" })).toEqual([1, 3, 4]);
        });

        it("contains", async () => {
            expect(await run({ nameContains: "Doe" })).toEqual([1, 2]);
        });

        it("contains with caseInsensitive", async () => {
            expect(await run({ nameContainsCi: "doe" })).toEqual([1, 2]);
        });

        it.runIf(caseSensitiveLike)("contains is case-sensitive", async () => {
            expect(await run({ nameContains: "doe" })).toEqual([]);
        });

        it("contains escapes `_`", async () => {
            expect(await run({ emailContains: "_" })).toEqual([3]);
        });

        it("contains escapes `%`", async () => {
            expect(await run({ emailContains: "%" })).toEqual([]);
        });

        it("contains escapes `\\`", async () => {
            expect(await run({ emailContains: "\\" })).toEqual([]);
        });

        it("inArray", async () => {
            expect(await run({ ageIn: [25, 40, 99] })).toEqual([2, 3]);
        });

        it("inArray with an empty list matches nothing", async () => {
            expect(await run({ ageIn: [] })).toEqual([]);
        });

        it("isNull", async () => {
            expect(await run({ phoneIsNull: true })).toEqual([2]);
            expect(await run({ phoneIsNull: false })).toEqual([1, 3, 4]);
        });

        it("isNotNull", async () => {
            expect(await run({ phoneIsNotNull: true })).toEqual([1, 3, 4]);
            expect(await run({ phoneIsNotNull: false })).toEqual([2]);
        });

        it("gt, gte, lt, lte", async () => {
            expect(await run({ olderThan: 30 })).toEqual([3]);
            expect(await run({ minAge: 30 })).toEqual([1, 3]);
            expect(await run({ youngerThan: 28 })).toEqual([2]);
            expect(await run({ maxAge: 28 })).toEqual([2, 4]);
        });

        it("combines multiple filters with AND", async () => {
            expect(await run({ minAge: 26, maxAge: 35 })).toEqual([1, 4]);
        });
    });

    describe("columns", () => {
        it("uses renamed columns", async () => {
            expect(await run({ isActive: 0 })).toEqual([3]);
        });

        it("quotes reserved words", async () => {
            expect(await run({ order: 2 })).toEqual([3]);
        });
    });

    describe("boolean filters", () => {
        it("and", async () => {
            expect(await run({ ageRange: 30 })).toEqual([1]);
            expect(await run({ ageRange: 31 })).toEqual([]);
        });

        it("or", async () => {
            expect(await run({ search: "smith" })).toEqual([3]);
            expect(await run({ search: "Doe" })).toEqual([1, 2]);
        });

        it("or keeps its grouping next to other filters", async () => {
            expect(await run({ search: "Doe", minAge: 30 })).toEqual([1]);
        });
    });

    describe("custom filters", () => {
        it("are wrapped in parentheses", async () => {
            const filter = sqlFilter<User>().def({
                name: { kind: "eq" },
                // Unparenthesized OR. Without wrapping, this would match id 1.
                idOneOrTwo: (_: boolean) => idOneOrTwo,
            });

            expect(
                await selectIds(filter({ name: "Jane Doe", idOneOrTwo: true })),
            ).toEqual([2]);
        });

        it("are skipped when they return undefined", async () => {
            const filter = sqlFilter<User>().def({
                name: { kind: "eq" },
                nothing: (_: boolean) => undefined,
            });

            expect(
                await selectIds(filter({ name: "Jane Doe", nothing: true })),
            ).toEqual([2]);
        });
    });

    it("infers input types", () => {
        type Input = SqlFilterInput<typeof userFilter>;

        expectTypeOf<Input["name"]>().toEqualTypeOf<string | undefined>();
        expectTypeOf<Input["ageIn"]>().toEqualTypeOf<number[] | undefined>();
        expectTypeOf<Input["phoneIsNull"]>().toEqualTypeOf<
            boolean | undefined
        >();
        expectTypeOf<Input["search"]>().toEqualTypeOf<string | undefined>();
    });
};
