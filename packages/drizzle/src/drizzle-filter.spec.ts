import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    expectTypeOf,
    it,
} from "vitest";
import { type DrizzleFilter, drizzleFilter } from "./drizzle-filter.ts";

// ----------------------------------------------------------------
// Schema Definition
// ----------------------------------------------------------------

const usersTable = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    age: integer("age").notNull(),
    phone: text("phone"),
    isActive: integer("isActive").notNull(), // SQLite/PG boolean as integer
    score: integer("score").notNull(),
});

type User = typeof usersTable.$inferSelect;

// ----------------------------------------------------------------
// Test Data (mirrors memory package)
// ----------------------------------------------------------------

const exampleUsers: Omit<User, "id">[] = [
    {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        phone: "555-1234",
        isActive: 1,
        score: 85,
    },
    {
        name: "Jane Doe",
        email: "jane@example.com",
        age: 25,
        phone: null,
        isActive: 1,
        score: 92,
    },
    {
        name: "Bob Smith",
        email: "bob@smith.org",
        age: 40,
        phone: "555-5678",
        isActive: 0,
        score: 78,
    },
    {
        name: "Alice Johnson",
        email: "alice@example.com",
        age: 28,
        phone: "555-9012",
        isActive: 1,
        score: 88,
    },
];

// ----------------------------------------------------------------
// Test Setup
// ----------------------------------------------------------------

let client: PGlite;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
    client = new PGlite();
    db = drizzle({ client });

    // Create the users table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT,
            "isActive" INTEGER NOT NULL,
            score INTEGER NOT NULL
        )
    `);
});

beforeEach(async () => {
    // Clear and reset data before each test
    await db.execute("TRUNCATE users RESTART IDENTITY");
    for (const user of exampleUsers) {
        await db.insert(usersTable).values(user);
    }
});

// ----------------------------------------------------------------
// Helper to extract filter input type
// ----------------------------------------------------------------

type FilterInput<T> = T extends DrizzleFilter<infer TInput> ? TInput : never;

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("Eq Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        nameEq: { kind: "eq", field: "name" },
        ageEq: { kind: "eq", field: "age" },
    });

    it("should filter by exact string match", async () => {
        const where = userFilter({ nameEq: "John Doe" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should filter by exact number match", async () => {
        const where = userFilter({ ageEq: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should return empty array when no matches", async () => {
        const where = userFilter({ nameEq: "Nonexistent User" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toEqual([]);
    });

    it("should support combining multiple eq filters", async () => {
        const where = userFilter({ nameEq: "John Doe", ageEq: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should return all when no filter value provided", async () => {
        const where = userFilter({});
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should return all when undefined filter input", async () => {
        const where = userFilter(undefined);
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            ageEq?: number;
        }>();
    });
});

describe("Neq Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        nameNeq: { kind: "neq", field: "name" },
        ageNeq: { kind: "neq", field: "age" },
    });

    it("should filter by not equal string match", async () => {
        const where = userFilter({ nameNeq: "John Doe" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name)).not.toContain("John Doe");
    });

    it("should filter by not equal number match", async () => {
        const where = userFilter({ ageNeq: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(3);
        expect(result.map((u) => u.age)).not.toContain(30);
    });

    it("should return all when no matches", async () => {
        const where = userFilter({ nameNeq: "Nonexistent User" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should support combining multiple neq filters", async () => {
        const where = userFilter({ nameNeq: "John Doe", ageNeq: 25 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Bob Smith",
        ]);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameNeq?: string;
            ageNeq?: number;
        }>();
    });
});

describe("Contains Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        emailContains: { kind: "contains", field: "email" },
        iEmailContains: {
            kind: "contains",
            field: "email",
            caseInsensitive: true,
        },
        nameContains: { kind: "contains", field: "name" },
    });

    it("should filter by substring match", async () => {
        const where = userFilter({ emailContains: "example.com" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should be case-sensitive by default", async () => {
        const where = userFilter({ nameContains: "john" });
        const result = await db.select().from(usersTable).where(where);

        // LIKE in PostgreSQL is case-sensitive
        expect(result).toHaveLength(0);
    });

    it("should accept `caseInsensitive` option", async () => {
        const where = userFilter({ iEmailContains: ".OrG" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            emailContains?: string;
            iEmailContains?: string;
            nameContains?: string;
        }>();
    });
});

describe("InArray Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        ageInArray: { kind: "inArray", field: "age" },
        nameInArray: { kind: "inArray", field: "name" },
    });

    it("should filter when value is in array", async () => {
        const where = userFilter({ ageInArray: [25, 30] });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should filter with single-element array", async () => {
        const where = userFilter({ ageInArray: [40] });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should return empty array when value not in array", async () => {
        const where = userFilter({ ageInArray: [100, 200] });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageInArray?: number[];
            nameInArray?: string[];
        }>();
    });
});

describe("IsNull Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        phoneIsNull: { kind: "isNull", field: "phone" },
    });

    it("should find null values when filter is true", async () => {
        const where = userFilter({ phoneIsNull: true });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Jane Doe");
    });

    it("should find non-null values when filter is false", async () => {
        const where = userFilter({ phoneIsNull: false });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Bob Smith",
            "John Doe",
        ]);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNull?: boolean;
        }>();
    });
});

describe("IsNotNull Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should find non-null values when filter is true", async () => {
        const where = userFilter({ phoneIsNotNull: true });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Bob Smith",
            "John Doe",
        ]);
    });

    it("should find null values when filter is false", async () => {
        const where = userFilter({ phoneIsNotNull: false });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Jane Doe");
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNotNull?: boolean;
        }>();
    });
});

describe("Greater Than (GT) Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        ageGreaterThan: { kind: "gt", field: "age" },
        scoreGreaterThan: { kind: "gt", field: "score" },
    });

    it("should filter values greater than threshold", async () => {
        const where = userFilter({ ageGreaterThan: 28 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Bob Smith",
            "John Doe",
        ]);
    });

    it("should not include values equal to threshold", async () => {
        const where = userFilter({ ageGreaterThan: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should return empty when no values exceed threshold", async () => {
        const where = userFilter({ ageGreaterThan: 100 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThan?: number;
            scoreGreaterThan?: number;
        }>();
    });
});

describe("Greater Than or Equal (GTE) Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        ageGreaterThanOrEqual: { kind: "gte", field: "age" },
        scoreGreaterThanOrEqual: { kind: "gte", field: "score" },
    });

    it("should filter values greater than or equal to threshold", async () => {
        const where = userFilter({ ageGreaterThanOrEqual: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Bob Smith",
            "John Doe",
        ]);
    });

    it("should include values equal to threshold", async () => {
        const where = userFilter({ scoreGreaterThanOrEqual: 88 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Jane Doe",
        ]);
    });

    it("should return all when threshold is lowest value", async () => {
        const where = userFilter({ ageGreaterThanOrEqual: 25 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThanOrEqual?: number;
            scoreGreaterThanOrEqual?: number;
        }>();
    });
});

describe("Less Than (LT) Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        ageLessThan: { kind: "lt", field: "age" },
        scoreLessThan: { kind: "lt", field: "score" },
    });

    it("should filter values less than threshold", async () => {
        const where = userFilter({ ageLessThan: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Jane Doe",
        ]);
    });

    it("should not include values equal to threshold", async () => {
        const where = userFilter({ ageLessThan: 28 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Jane Doe");
    });

    it("should work with scores", async () => {
        const where = userFilter({ scoreLessThan: 80 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should return empty when no values below threshold", async () => {
        const where = userFilter({ ageLessThan: 20 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThan?: number;
            scoreLessThan?: number;
        }>();
    });
});

describe("Less Than or Equal (LTE) Filter", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        ageLessThanOrEqual: { kind: "lte", field: "age" },
        scoreLessThanOrEqual: { kind: "lte", field: "score" },
    });

    it("should filter values less than or equal to threshold", async () => {
        const where = userFilter({ ageLessThanOrEqual: 28 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Jane Doe",
        ]);
    });

    it("should include values equal to threshold", async () => {
        const where = userFilter({ scoreLessThanOrEqual: 78 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should return all when threshold is highest value", async () => {
        const where = userFilter({ ageLessThanOrEqual: 40 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThanOrEqual?: number;
            scoreLessThanOrEqual?: number;
        }>();
    });
});

describe("Combined Filters", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        nameContains: { kind: "contains", field: "name" },
        ageGreaterThan: { kind: "gt", field: "age" },
        ageLessThan: { kind: "lt", field: "age" },
        isActive: { kind: "eq", field: "isActive" },
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should apply all filters in AND logic", async () => {
        const where = userFilter({
            nameContains: "Doe",
            ageGreaterThan: 24,
            ageLessThan: 31,
            isActive: 1,
            phoneIsNotNull: true,
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should filter by age range", async () => {
        const where = userFilter({
            ageGreaterThan: 27,
            ageLessThan: 40,
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "John Doe",
        ]);
    });

    it("should find active users without phone numbers", async () => {
        const where = userFilter({
            isActive: 1,
            phoneIsNotNull: false,
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Jane Doe");
    });

    it("should support partial filtering", async () => {
        const where = userFilter({
            nameContains: "Smith",
            isActive: 0,
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameContains?: string;
            ageGreaterThan?: number;
            ageLessThan?: number;
            isActive?: number;
            phoneIsNotNull?: boolean;
        }>();
    });
});

describe("Boolean AND Filter", () => {
    it("should work with age exact match using range conditions", async () => {
        const ageExactFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const where = ageExactFilter({
            ageExact: 30, // >= 30 AND <= 30 means exactly 30
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should work with multiple numeric comparisons on same field", async () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            ageNotInRange: {
                kind: "and",
                conditions: [
                    { kind: "gt", field: "age" },
                    { kind: "lt", field: "age" },
                ],
            },
        });

        const where = ageFilter({ ageNotInRange: 30 });
        const result = await db.select().from(usersTable).where(where);

        // Nobody can be both > 30 AND < 30 simultaneously
        expect(result).toEqual([]);
    });

    it("should return all when filter value is undefined", async () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const where = ageFilter({});
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        type Input = FilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
        }>();
    });
});

describe("Boolean OR Filter", () => {
    it("should find values outside a range", async () => {
        const ageOutsideRangeFilter = drizzleFilter(usersTable).filterDef({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const where = ageOutsideRangeFilter({
            youngOrOld: 28,
        });
        const result = await db.select().from(usersTable).where(where);

        // Jane (25 < 28), John (30 > 28), Bob (40 > 28)
        // Alice is exactly 28, so excluded
        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Bob Smith",
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should work with score threshold OR conditions", async () => {
        const scoreFilter = drizzleFilter(usersTable).filterDef({
            extremeScores: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "score" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        const where = scoreFilter({ extremeScores: 85 });
        const result = await db.select().from(usersTable).where(where);

        // Bob (78 < 85), Jane (92 > 85), Alice (88 > 85)
        // John is exactly 85, so excluded
        expect(result).toHaveLength(3);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Alice Johnson",
            "Bob Smith",
            "Jane Doe",
        ]);
    });

    it("should work with string contains on multiple fields", async () => {
        const stringFilter = drizzleFilter(usersTable).filterDef({
            containsInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const where = stringFilter({ containsInNameOrEmail: "Doe" });
        const result = await db.select().from(usersTable).where(where);

        // John and Jane have "Doe" in name
        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should return all when filter value is undefined", async () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const where = ageFilter({});
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        type Input = FilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            youngOrOld?: number;
        }>();
    });
});

describe("Complex Boolean Filters", () => {
    it("should support multiple boolean filters together", async () => {
        const complexFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
            scoreExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                ],
            },
        });

        const where = complexFilter({ ageExact: 30, scoreExact: 85 });
        const result = await db.select().from(usersTable).where(where);

        // Only John is 30 years old with score of 85
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should combine boolean filter with primitive filters", async () => {
        const mixedFilter = drizzleFilter(usersTable).filterDef({
            nameContains: { kind: "contains", field: "name" },
            ageOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const where = mixedFilter({
            nameContains: "Doe",
            ageOutsideRange: 27,
        });
        const result = await db.select().from(usersTable).where(where);

        // Jane Doe is 25 (< 27), John Doe is 30 (> 27)
        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should handle three numeric conditions in AND on same field", async () => {
        const tripleAndFilter = drizzleFilter(usersTable).filterDef({
            scoreInRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                    { kind: "eq", field: "score" },
                ],
            },
        });

        const where = tripleAndFilter({ scoreInRange: 85 });
        const result = await db.select().from(usersTable).where(where);

        // Only John has score exactly 85
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should handle three conditions in OR on same field", async () => {
        const tripleOrFilter = drizzleFilter(usersTable).filterDef({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "eq", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const where = tripleOrFilter({ ageMatch: 30 });
        const result = await db.select().from(usersTable).where(where);

        // Everyone matches: Jane & Alice (< 30), John (== 30), Bob (> 30)
        expect(result).toHaveLength(4);
    });

    it("should work with string matching across multiple fields", async () => {
        const stringFilter = drizzleFilter(usersTable).filterDef({
            matchInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const where = stringFilter({ matchInNameOrEmail: "smith" });
        const result = await db.select().from(usersTable).where(where);

        // Bob has "smith" in email (bob@smith.org), but "Smith" in name (case-sensitive)
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Bob Smith");
    });

    it("should infer the correct input type", () => {
        const complexFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
            scoreExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                ],
            },
        });

        type Input = FilterInput<typeof complexFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
            scoreExact?: number;
        }>();
    });
});

describe("Boolean Filter Edge Cases", () => {
    it("should handle undefined filter values for boolean filters", async () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const where = ageFilter({});
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should apply both AND and OR filters together", async () => {
        const combinedFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
            scoreOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "score" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        const where = combinedFilter({
            ageExact: 30,
            scoreOutsideRange: 85,
        });
        const result = await db.select().from(usersTable).where(where);

        // John is 30 but score is exactly 85, so excluded by scoreOutsideRange
        expect(result).toEqual([]);
    });

    it("should work with multiple OR conditions on same field", async () => {
        const ageFilter = drizzleFilter(usersTable).filterDef({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "eq", field: "age" },
                    { kind: "eq", field: "age" },
                ],
            },
        });

        const where = ageFilter({ ageMatch: 30 });
        const result = await db.select().from(usersTable).where(where);

        // Duplicate conditions still work - finds John with age 30
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should work with inArray in OR boolean filters", async () => {
        const arrayFilter = drizzleFilter(usersTable).filterDef({
            ageInArrays: {
                kind: "or",
                conditions: [
                    { kind: "inArray", field: "age" },
                    { kind: "inArray", field: "score" },
                ],
            },
        });

        const where = arrayFilter({ ageInArrays: [25, 30] });
        const result = await db.select().from(usersTable).where(where);

        // Age matches for John (30) and Jane (25)
        // Score doesn't match anyone (no one has score of 25 or 30)
        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Jane Doe",
            "John Doe",
        ]);
    });

    it("should infer the correct input type", () => {
        const combinedFilter = drizzleFilter(usersTable).filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
            scoreOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "score" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        type Input = FilterInput<typeof combinedFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
            scoreOutsideRange?: number;
        }>();
    });
});

describe("Custom Filters", () => {
    it("should work with custom SQL filter", async () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            // Custom filter that checks if age is divisible by a number
            ageDivisibleBy: (divisor: number) =>
                sql`${usersTable.age} % ${divisor} = 0`,
        });

        const where = userFilter({ ageDivisibleBy: 10 });
        const result = await db.select().from(usersTable).where(where);

        // John (30) and Bob (40) have ages divisible by 10
        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Bob Smith",
            "John Doe",
        ]);
    });

    it("should work with custom filter returning undefined", async () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            // Custom filter that returns undefined for "all"
            optionalAgeFilter: (val: number | "all") =>
                val === "all" ? undefined : eq(usersTable.age, val),
        });

        const where = userFilter({ optionalAgeFilter: "all" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type for custom filters", () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            ageDivisibleBy: (divisor: number) =>
                sql`${usersTable.age} % ${divisor} = 0`,
            optionalFilter: (val: string | null) =>
                val ? eq(usersTable.name, val) : undefined,
        });

        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageDivisibleBy?: number;
            optionalFilter?: string | null;
        }>();
    });
});

describe("Edge Cases", () => {
    const userFilter = drizzleFilter(usersTable).filterDef({
        nameEq: { kind: "eq", field: "name" },
        emailContains: { kind: "contains", field: "email" },
        ageGreaterThan: { kind: "gt", field: "age" },
    });

    it("should handle empty filter input", async () => {
        const where = userFilter({});
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should handle undefined filter input", async () => {
        const where = userFilter(undefined);
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should handle partial filter input", async () => {
        const where = userFilter({ nameEq: "John Doe" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should handle zero in numeric comparisons", async () => {
        const where = userFilter({ ageGreaterThan: 0 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should handle empty string in contains filter", async () => {
        const where = userFilter({ emailContains: "" });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(4);
    });

    it("should infer the correct input type", () => {
        type Input = FilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            emailContains?: string;
            ageGreaterThan?: number;
        }>();
    });
});

describe("Field Inference", () => {
    it("should infer field from filter key when not specified", async () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            name: { kind: "eq" }, // field inferred from key
            age: { kind: "gte" }, // field inferred from key
        });

        const where = userFilter({ name: "John Doe", age: 30 });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("John Doe");
    });

    it("should use explicit field over key", async () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            emailContains: { kind: "contains", field: "email" },
            nameSearch: { kind: "contains", field: "name" },
        });

        const where = userFilter({
            emailContains: "example.com",
            nameSearch: "Doe",
        });
        const result = await db.select().from(usersTable).where(where);

        expect(result).toHaveLength(2);
        expect(result.map((u) => u.name).sort()).toEqual([
            "Jane Doe",
            "John Doe",
        ]);
    });
});

describe("SQL Output Verification", () => {
    it("should return undefined when no filters applied", () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            name: { kind: "eq" },
        });

        const where = userFilter({});
        expect(where).toBeUndefined();
    });

    it("should return undefined when filter input is undefined", () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            name: { kind: "eq" },
        });

        const where = userFilter(undefined);
        expect(where).toBeUndefined();
    });

    it("should return SQL when filter is applied", () => {
        const userFilter = drizzleFilter(usersTable).filterDef({
            name: { kind: "eq" },
        });

        const where = userFilter({ name: "John" });
        expect(where).toBeDefined();
    });
});
