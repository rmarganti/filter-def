import { describe, expect, expectTypeOf, it } from "vitest";
import type { InMemoryFilterInput } from "./index.ts";
import { inMemoryFilter } from "./index.ts";

interface User {
    name: string;
    email: string;
    age: number;
    phone?: string;
    isActive: boolean;
    score: number;
    posts: Array<Post>;
}

interface Post {
    id: string;
    title: string;
    content: string;
}

const userEntity = inMemoryFilter<User>();
const postEntity = inMemoryFilter<Post>();

const exampleUsers: Array<User> = [
    {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        phone: "555-1234",
        isActive: true,
        score: 85,
        posts: [
            { id: "1", title: "Post 1", content: "Content 1" },
            { id: "2", title: "Post 2", content: "Content 2" },
        ],
    },
    {
        name: "Jane Doe",
        email: "jane@example.com",
        age: 25,
        phone: undefined,
        isActive: true,
        score: 92,
        posts: [
            { id: "3", title: "Post 3", content: "Content 3" },
            { id: "4", title: "Post 4", content: "Content 4" },
        ],
    },
    {
        name: "Bob Smith",
        email: "bob@smith.org",
        age: 40,
        phone: "555-5678",
        isActive: false,
        score: 78,
        posts: [],
    },
    {
        name: "Alice Johnson",
        email: "alice@example.com",
        age: 28,
        phone: "555-9012",
        isActive: true,
        score: 88,
        posts: [],
    },
];

describe("Eq Filter", () => {
    const userFilter = userEntity.def({
        nameEq: { kind: "eq", field: "name" },
        ageEq: { kind: "eq", field: "age" },
    });

    it("should filter by exact string match", () => {
        const predicate = userFilter({ nameEq: "John Doe" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should filter by exact number match", () => {
        const predicate = userFilter({ ageEq: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should return empty array when no matches", () => {
        const predicate = userFilter({ nameEq: "Nonexistent User" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should support combining multiple eq filters", () => {
        const predicate = userFilter({ nameEq: "John Doe", ageEq: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should return all when no filter value provided", () => {
        const predicate = userFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            ageEq?: number;
        }>();
    });
});

describe("Neq Filter", () => {
    const userFilter = userEntity.def({
        nameNeq: { kind: "neq", field: "name" },
        ageNeq: { kind: "neq", field: "age" },
    });

    it("should filter by not equal string match", () => {
        const predicate = userFilter({ nameNeq: "John Doe" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([
            exampleUsers[1],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should filter by not equal number match", () => {
        const predicate = userFilter({ ageNeq: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([
            exampleUsers[1],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should return all when no matches", () => {
        const predicate = userFilter({ nameNeq: "Nonexistent User" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should support combining multiple neq filters", () => {
        const predicate = userFilter({ nameNeq: "John Doe", ageNeq: 25 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2], exampleUsers[3]]);
    });

    it("should return all when no filter value provided", () => {
        const predicate = userFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameNeq?: string;
            ageNeq?: number;
        }>();
    });
});

describe("Contains Filter", () => {
    const userFilter = userEntity.def({
        emailContains: { kind: "contains", field: "email" },
        iEmailContains: {
            kind: "contains",
            field: "email",
            caseInsensitive: true,
        },
        nameContains: { kind: "contains", field: "name" },
    });

    it("should filter by substring match", () => {
        const predicate = userFilter({ emailContains: "example.com" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[3],
        ]);
    });

    it("should be case-sensitive", () => {
        const predicate = userFilter({ nameContains: "john" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should accept `caseInsensitive` option", () => {
        const predicate = userFilter({ iEmailContains: ".OrG" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            emailContains?: string;
            iEmailContains?: string;
            nameContains?: string;
        }>();
    });
});

describe("InArray Filter", () => {
    const userFilter = userEntity.def({
        ageInArray: { kind: "inArray", field: "age" },
        nameInArray: { kind: "inArray", field: "name" },
    });

    it("should filter when value is in array", () => {
        const predicate = userFilter({ ageInArray: [25, 30] });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should filter with single-element array", () => {
        const predicate = userFilter({ ageInArray: [40] });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty array when value not in array", () => {
        const predicate = userFilter({ ageInArray: [100, 200] });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageInArray?: number[];
            nameInArray?: string[];
        }>();
    });
});

describe("IsNull Filter", () => {
    const userFilter = userEntity.def({
        phoneIsNull: { kind: "isNull", field: "phone" },
    });

    it("should find null/undefined values when filter is true", () => {
        const predicate = userFilter({ phoneIsNull: true });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should find non-null values when filter is false", () => {
        const predicate = userFilter({ phoneIsNull: false });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNull?: boolean;
        }>();
    });
});

describe("IsNotNull Filter", () => {
    const userFilter = userEntity.def({
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should find non-null values when filter is true", () => {
        const predicate = userFilter({ phoneIsNotNull: true });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should find null/undefined values when filter is false", () => {
        const predicate = userFilter({ phoneIsNotNull: false });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNotNull?: boolean;
        }>();
    });
});

describe("Greater Than (GT) Filter", () => {
    const userFilter = userEntity.def({
        ageGreaterThan: { kind: "gt", field: "age" },
        scoreGreaterThan: { kind: "gt", field: "score" },
    });

    it("should filter values greater than threshold", () => {
        const predicate = userFilter({ ageGreaterThan: 28 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0], exampleUsers[2]]);
    });

    it("should not include values equal to threshold", () => {
        const predicate = userFilter({ ageGreaterThan: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty when no values exceed threshold", () => {
        const predicate = userFilter({ ageGreaterThan: 100 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThan?: number;
            scoreGreaterThan?: number;
        }>();
    });
});

describe("Greater Than or Equal (GTE) Filter", () => {
    const userFilter = userEntity.def({
        ageGreaterThanOrEqual: { kind: "gte", field: "age" },
        scoreGreaterThanOrEqual: { kind: "gte", field: "score" },
    });

    it("should filter values greater than or equal to threshold", () => {
        const predicate = userFilter({ ageGreaterThanOrEqual: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0], exampleUsers[2]]);
    });

    it("should include values equal to threshold", () => {
        const predicate = userFilter({ scoreGreaterThanOrEqual: 88 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should return all when threshold is lowest value", () => {
        const predicate = userFilter({ ageGreaterThanOrEqual: 25 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThanOrEqual?: number;
            scoreGreaterThanOrEqual?: number;
        }>();
    });
});

describe("Less Than (LT) Filter", () => {
    const userFilter = userEntity.def({
        ageLessThan: { kind: "lt", field: "age" },
        scoreLessThan: { kind: "lt", field: "score" },
    });

    it("should filter values less than threshold", () => {
        const predicate = userFilter({ ageLessThan: 30 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should not include values equal to threshold", () => {
        const predicate = userFilter({ ageLessThan: 28 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should work with scores", () => {
        const predicate = userFilter({ scoreLessThan: 80 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty when no values below threshold", () => {
        const predicate = userFilter({ ageLessThan: 20 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThan?: number;
            scoreLessThan?: number;
        }>();
    });
});

describe("Less Than or Equal (LTE) Filter", () => {
    const userFilter = userEntity.def({
        ageLessThanOrEqual: { kind: "lte", field: "age" },
        scoreLessThanOrEqual: { kind: "lte", field: "score" },
    });

    it("should filter values less than or equal to threshold", () => {
        const predicate = userFilter({ ageLessThanOrEqual: 28 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should include values equal to threshold", () => {
        const predicate = userFilter({ scoreLessThanOrEqual: 78 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return all when threshold is highest value", () => {
        const predicate = userFilter({ ageLessThanOrEqual: 40 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThanOrEqual?: number;
            scoreLessThanOrEqual?: number;
        }>();
    });
});

describe("Combined Filters", () => {
    const userFilter = userEntity.def({
        nameContains: { kind: "contains", field: "name" },
        ageGreaterThan: { kind: "gt", field: "age" },
        ageLessThan: { kind: "lt", field: "age" },
        isActive: { kind: "eq", field: "isActive" },
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should apply all filters in AND logic", () => {
        const predicate = userFilter({
            nameContains: "Doe",
            ageGreaterThan: 24,
            ageLessThan: 31,
            isActive: true,
            phoneIsNotNull: true,
        });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should filter by age range", () => {
        const predicate = userFilter({
            ageGreaterThan: 27,
            ageLessThan: 40,
        });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0], exampleUsers[3]]);
    });

    it("should find active users without phone numbers", () => {
        const predicate = userFilter({
            isActive: true,
            phoneIsNotNull: false,
        });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should support partial filtering", () => {
        const predicate = userFilter({
            nameContains: "Smith",
            isActive: false,
        });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameContains?: string;
            ageGreaterThan?: number;
            ageLessThan?: number;
            isActive?: boolean;
            phoneIsNotNull?: boolean;
        }>();
    });
});

describe("Boolean AND Filter", () => {
    it("should work with age exact match using range conditions", () => {
        const ageExactFilter = userEntity.def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const predicate = ageExactFilter({
            ageExact: 30, // >= 30 AND <= 30 means exactly 30
        });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with multiple numeric comparisons on same field", () => {
        const ageFilter = userEntity.def({
            ageNotInRange: {
                kind: "and",
                conditions: [
                    { kind: "gt", field: "age" },
                    { kind: "lt", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({ ageNotInRange: 30 });
        const result = exampleUsers.filter(predicate);

        // Nobody can be both > 30 AND < 30 simultaneously
        expect(result).toEqual([]);
    });

    it("should return all when filter value is undefined", () => {
        const ageFilter = userEntity.def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        const ageFilter = userEntity.def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        type Input = InMemoryFilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
        }>();
    });
});

describe("Boolean OR Filter", () => {
    it("should find values outside a range", () => {
        const ageOutsideRangeFilter = userEntity.def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const predicate = ageOutsideRangeFilter({
            youngOrOld: 28,
        });
        const result = exampleUsers.filter(predicate);

        // Jane (25 < 28), John (30 > 28), and Bob (40 > 28)
        // Alice is exactly 28, so excluded
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[2],
        ]);
    });

    it("should work with score threshold OR conditions", () => {
        const scoreFilter = userEntity.def({
            extremeScores: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "score" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        const predicate = scoreFilter({ extremeScores: 85 });
        const result = exampleUsers.filter(predicate);

        // Bob (78 < 85), Jane (92 > 85), Alice (88 > 85)
        // John is exactly 85, so excluded
        expect(result).toEqual([
            exampleUsers[1],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should work with string contains on multiple fields", () => {
        const stringFilter = userEntity.def({
            containsInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const predicate = stringFilter({ containsInNameOrEmail: "Doe" });
        const result = exampleUsers.filter(predicate);

        // John and Jane have "Doe" in name
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should return all when filter value is undefined", () => {
        const ageFilter = userEntity.def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        const ageFilter = userEntity.def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        type Input = InMemoryFilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            youngOrOld?: number;
        }>();
    });
});

describe("Complex Boolean Filters", () => {
    it("should support multiple boolean filters together", () => {
        const complexFilter = userEntity.def({
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

        const predicate = complexFilter({ ageExact: 30, scoreExact: 85 });
        const result = exampleUsers.filter(predicate);

        // Only John is 30 years old with score of 85
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should combine boolean filter with primitive filters", () => {
        const mixedFilter = userEntity.def({
            nameContains: { kind: "contains", field: "name" },
            ageOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const predicate = mixedFilter({
            nameContains: "Doe",
            ageOutsideRange: 27,
        });
        const result = exampleUsers.filter(predicate);

        // Jane Doe is 25 (< 27) and John Doe is 30 (> 27)
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should handle three numeric conditions in AND on same field", () => {
        const tripleAndFilter = userEntity.def({
            scoreInRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                    { kind: "eq", field: "score" },
                ],
            },
        });

        const predicate = tripleAndFilter({ scoreInRange: 85 });
        const result = exampleUsers.filter(predicate);

        // Only John has score exactly 85
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should handle three conditions in OR on same field", () => {
        const tripleOrFilter = userEntity.def({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "eq", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const predicate = tripleOrFilter({ ageMatch: 30 });
        const result = exampleUsers.filter(predicate);

        // Everyone matches: Jane & Alice (< 30), John (== 30), Bob (> 30)
        expect(result).toEqual(exampleUsers);
    });

    it("should work with string matching across multiple fields", () => {
        const stringFilter = userEntity.def({
            matchInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const predicate = stringFilter({ matchInNameOrEmail: "smith" });
        const result = exampleUsers.filter(predicate);

        // Bob Smith has "smith" in name and email
        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should infer the correct input type", () => {
        const complexFilter = userEntity.def({
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

        type Input = InMemoryFilterInput<typeof complexFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
            scoreExact?: number;
        }>();
    });
});

describe("Boolean Filter Edge Cases", () => {
    it("should handle empty array with boolean filters", () => {
        const ageFilter = userEntity.def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({ ageExact: 30 });
        const result = [].filter(predicate);

        expect(result).toEqual([]);
    });

    it("should handle undefined filter values for boolean filters", () => {
        const ageFilter = userEntity.def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should apply both AND and OR filters together", () => {
        const combinedFilter = userEntity.def({
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

        const predicate = combinedFilter({
            ageExact: 30,
            scoreOutsideRange: 85,
        });
        const result = exampleUsers.filter(predicate);

        // John is 30 but score is exactly 85, so excluded by scoreOutsideRange
        expect(result).toEqual([]);
    });

    it("should work with multiple OR conditions on same field", () => {
        const ageFilter = userEntity.def({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "eq", field: "age" },
                    { kind: "eq", field: "age" },
                ],
            },
        });

        const predicate = ageFilter({ ageMatch: 30 });
        const result = exampleUsers.filter(predicate);

        // Duplicate conditions still work - finds John with age 30
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with inArray in OR boolean filters", () => {
        const arrayFilter = userEntity.def({
            ageInArrays: {
                kind: "or",
                conditions: [
                    { kind: "inArray", field: "age" },
                    { kind: "inArray", field: "score" },
                ],
            },
        });

        const predicate = arrayFilter({ ageInArrays: [25, 30] });
        const result = exampleUsers.filter(predicate);

        // Age matches for John (30) and Jane (25)
        // Score doesn't match anyone (no one has score of 25 or 30)
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should infer the correct input type", () => {
        const combinedFilter = userEntity.def({
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

        type Input = InMemoryFilterInput<typeof combinedFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
            scoreOutsideRange?: number;
        }>();
    });
});

describe("Custom Filters", () => {
    const postFilter = postEntity.def({
        id: { kind: "eq", field: "id" },
    });

    const userFilter = userEntity.def({
        wrotePostId: (user: User, postId: string) => {
            return user.posts.some(postFilter({ id: postId }));
        },

        hasPosts: (user: User, val: boolean) => {
            const postCount = user.posts.length ?? 0;
            return val ? postCount > 0 : postCount === 0;
        },
    });

    it("should filter values matching a custom filter", () => {
        const predicate = userFilter({ wrotePostId: "1" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should return an empty array if no values match", () => {
        const predicate = userFilter({ wrotePostId: "5" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([]);
    });

    it("should return all when all values match", () => {
        const predicate = userFilter({ hasPosts: true });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            wrotePostId?: string;
            hasPosts?: boolean;
        }>();
    });
});

describe("Edge Cases", () => {
    const userFilter = userEntity.def({
        nameEq: { kind: "eq", field: "name" },
        emailContains: { kind: "contains", field: "email" },
        ageGreaterThan: { kind: "gt", field: "age" },
    });

    it("should handle empty entities array", () => {
        const predicate = userFilter({ nameEq: "John Doe" });
        const result = [].filter(predicate);

        expect(result).toEqual([]);
    });

    it("should handle empty filter input", () => {
        const predicate = userFilter({});
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should handle undefined filter input", () => {
        const predicate = userFilter(undefined);
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should handle partial filter input", () => {
        const predicate = userFilter({ nameEq: "John Doe" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should handle zero in numeric comparisons", () => {
        const predicate = userFilter({ ageGreaterThan: 0 });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should handle empty string in contains filter", () => {
        const predicate = userFilter({ emailContains: "" });
        const result = exampleUsers.filter(predicate);

        expect(result).toEqual(exampleUsers);
    });

    it("should infer the correct input type", () => {
        type Input = InMemoryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            emailContains?: string;
            ageGreaterThan?: number;
        }>();
    });
});

describe("Boolean Filter Field Requirement Validation", () => {
    it("should allow boolean filters when all conditions have explicit fields", () => {
        // This should compile - all conditions have required field properties
        const filter = userEntity.def({
            eitherNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "eq", field: "name" },
                    { kind: "eq", field: "email" },
                ],
            },
            ratingAtLeast: {
                kind: "or",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "gte", field: "age" },
                ],
            },
        });

        const predicate = filter({
            eitherNameOrEmail: "John Doe",
            ratingAtLeast: 80,
        });
        const result = exampleUsers.filter(predicate);

        // John has name "John Doe" (matches) and score 85 >= 80 (matches)
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with AND filter across different fields", () => {
        const filter = userEntity.def({
            activeAndYoung: {
                kind: "and",
                conditions: [
                    { kind: "eq", field: "isActive" },
                    { kind: "lt", field: "age" },
                ],
            },
        });

        const predicate = filter({ activeAndYoung: true });
        const result = exampleUsers.filter(predicate);

        // This is a contrived example - we're using `true` for both isActive (boolean)
        // and age < true (which converts to 1), so it finds users where isActive=true AND age < 1
        // Nobody matches this
        expect(result).toEqual([]);
    });

    it("should work with OR filter searching across multiple string fields", () => {
        const filter = userEntity.def({
            searchTerm: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const predicate = filter({ searchTerm: "example.com" });
        const result = exampleUsers.filter(predicate);

        // Finds users with "example.com" in name or email
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[3],
        ]);
    });

    it("should infer correct input types for boolean filters", () => {
        const filter = userEntity.def({
            eitherNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "eq", field: "name" },
                    { kind: "eq", field: "email" },
                ],
            },
            ageRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        type Input = InMemoryFilterInput<typeof filter>;

        // The input is a union of string (from name or email)
        expectTypeOf<Input>().toEqualTypeOf<{
            eitherNameOrEmail?: string;
            ageRange?: number;
        }>();
    });

    // Type-level validation tests - these demonstrate the validation works
    it("should demonstrate type validation catches missing fields", () => {
        // ❌ INVALID: condition missing field property
        userEntity.def({
            // @ts-expect-error the second `contains` condition is missing the `field` property
            searchAnywhere: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains" }, // Missing required field
                ],
            },
        });

        // ❌ INVALID: all conditions missing field properties
        userEntity.def({
            // @ts-expect-error all conditions are missing the `field` property
            somethingWrong: {
                kind: "and",
                conditions: [
                    { kind: "gt" }, // Missing required field
                    { kind: "lt" }, // Missing required field
                ],
            },
        });

        expect(true).toBe(true);
    });
});
