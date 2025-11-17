import { describe, expect, it } from "vitest";
import { entity } from "./filter-def";

interface User {
    name: string;
    email: string;
    age: number;
    phone?: string;
    isActive: boolean;
    score: number;
}

const userEntity = entity<User>();

const exampleUsers: Array<User> = [
    {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        phone: "555-1234",
        isActive: true,
        score: 85,
    },
    {
        name: "Jane Doe",
        email: "jane@example.com",
        age: 25,
        phone: undefined,
        isActive: true,
        score: 92,
    },
    {
        name: "Bob Smith",
        email: "bob@smith.org",
        age: 40,
        phone: "555-5678",
        isActive: false,
        score: 78,
    },
    {
        name: "Alice Johnson",
        email: "alice@example.com",
        age: 28,
        phone: "555-9012",
        isActive: true,
        score: 88,
    },
];

describe("Equals Filter", () => {
    const userFilter = userEntity.filterDef({
        nameEquals: { kind: "equals", field: "name" },
        ageEquals: { kind: "equals", field: "age" },
    });

    it("should filter by exact string match", () => {
        const result = userFilter(exampleUsers, {
            nameEquals: "John Doe",
        });

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should filter by exact number match", () => {
        const result = userFilter(exampleUsers, {
            ageEquals: 30,
        });

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should return empty array when no matches", () => {
        const result = userFilter(exampleUsers, {
            nameEquals: "Nonexistent User",
        });

        expect(result).toEqual([]);
    });

    it("should support combining multiple equals filters", () => {
        const result = userFilter(exampleUsers, {
            nameEquals: "John Doe",
            ageEquals: 30,
        });

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should return all when no filter value provided", () => {
        const result = userFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });
});

describe("Contains Filter", () => {
    const userFilter = userEntity.filterDef({
        emailContains: { kind: "contains", field: "email" },
        nameContains: { kind: "contains", field: "name" },
    });

    it("should filter by substring match", () => {
        const result = userFilter(exampleUsers, {
            emailContains: "example.com",
        });

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[3],
        ]);
    });

    it("should be case-sensitive", () => {
        const result = userFilter(exampleUsers, {
            nameContains: "john",
        });

        expect(result).toEqual([]);
    });
});

describe("InArray Filter", () => {
    const userFilter = userEntity.filterDef({
        ageInArray: { kind: "inArray", field: "age" },
        nameInArray: { kind: "inArray", field: "name" },
    });

    it("should filter when value is in array", () => {
        const result = userFilter(exampleUsers, {
            ageInArray: [25, 30],
        });

        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should filter with single-element array", () => {
        const result = userFilter(exampleUsers, {
            ageInArray: [40],
        });

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty array when value not in array", () => {
        const result = userFilter(exampleUsers, {
            ageInArray: [100, 200],
        });

        expect(result).toEqual([]);
    });
});

describe("IsNull Filter", () => {
    const userFilter = userEntity.filterDef({
        phoneIsNull: { kind: "isNull", field: "phone" },
    });

    it("should find null/undefined values when filter is true", () => {
        const result = userFilter(exampleUsers, {
            phoneIsNull: true,
        });

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should find non-null values when filter is false", () => {
        const result = userFilter(exampleUsers, {
            phoneIsNull: false,
        });

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });
});

describe("IsNotNull Filter", () => {
    const userFilter = userEntity.filterDef({
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should find non-null values when filter is true", () => {
        const result = userFilter(exampleUsers, {
            phoneIsNotNull: true,
        });

        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should find null/undefined values when filter is false", () => {
        const result = userFilter(exampleUsers, {
            phoneIsNotNull: false,
        });

        expect(result).toEqual([exampleUsers[1]]);
    });
});

describe("Greater Than (GT) Filter", () => {
    const userFilter = userEntity.filterDef({
        ageGreaterThan: { kind: "gt", field: "age" },
        scoreGreaterThan: { kind: "gt", field: "score" },
    });

    it("should filter values greater than threshold", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThan: 28,
        });

        expect(result).toEqual([exampleUsers[0], exampleUsers[2]]);
    });

    it("should not include values equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThan: 30,
        });

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty when no values exceed threshold", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThan: 100,
        });

        expect(result).toEqual([]);
    });
});

describe("Greater Than or Equal (GTE) Filter", () => {
    const userFilter = userEntity.filterDef({
        ageGreaterThanOrEqual: { kind: "gte", field: "age" },
        scoreGreaterThanOrEqual: { kind: "gte", field: "score" },
    });

    it("should filter values greater than or equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThanOrEqual: 30,
        });

        expect(result).toEqual([exampleUsers[0], exampleUsers[2]]);
    });

    it("should include values equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            scoreGreaterThanOrEqual: 88,
        });

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should return all when threshold is lowest value", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThanOrEqual: 25,
        });

        expect(result).toEqual(exampleUsers);
    });
});

describe("Less Than (LT) Filter", () => {
    const userFilter = userEntity.filterDef({
        ageLessThan: { kind: "lt", field: "age" },
        scoreLessThan: { kind: "lt", field: "score" },
    });

    it("should filter values less than threshold", () => {
        const result = userFilter(exampleUsers, {
            ageLessThan: 30,
        });

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should not include values equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            ageLessThan: 28,
        });

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should work with scores", () => {
        const result = userFilter(exampleUsers, {
            scoreLessThan: 80,
        });

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return empty when no values below threshold", () => {
        const result = userFilter(exampleUsers, {
            ageLessThan: 20,
        });

        expect(result).toEqual([]);
    });
});

describe("Less Than or Equal (LTE) Filter", () => {
    const userFilter = userEntity.filterDef({
        ageLessThanOrEqual: { kind: "lte", field: "age" },
        scoreLessThanOrEqual: { kind: "lte", field: "score" },
    });

    it("should filter values less than or equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            ageLessThanOrEqual: 28,
        });

        expect(result).toEqual([exampleUsers[1], exampleUsers[3]]);
    });

    it("should include values equal to threshold", () => {
        const result = userFilter(exampleUsers, {
            scoreLessThanOrEqual: 78,
        });

        expect(result).toEqual([exampleUsers[2]]);
    });

    it("should return all when threshold is highest value", () => {
        const result = userFilter(exampleUsers, {
            ageLessThanOrEqual: 40,
        });

        expect(result).toEqual(exampleUsers);
    });
});

describe("Combined Filters", () => {
    const userFilter = userEntity.filterDef({
        nameContains: { kind: "contains", field: "name" },
        ageGreaterThan: { kind: "gt", field: "age" },
        ageLessThan: { kind: "lt", field: "age" },
        isActive: { kind: "equals", field: "isActive" },
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should apply all filters in AND logic", () => {
        const result = userFilter(exampleUsers, {
            nameContains: "Doe",
            ageGreaterThan: 24,
            ageLessThan: 31,
            isActive: true,
            phoneIsNotNull: true,
        });

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should filter by age range", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThan: 27,
            ageLessThan: 40,
        });

        expect(result).toEqual([exampleUsers[0], exampleUsers[3]]);
    });

    it("should find active users without phone numbers", () => {
        const result = userFilter(exampleUsers, {
            isActive: true,
            phoneIsNotNull: false,
        });

        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should support partial filtering", () => {
        const result = userFilter(exampleUsers, {
            nameContains: "Smith",
            isActive: false,
        });

        expect(result).toEqual([exampleUsers[2]]);
    });
});

describe("Boolean AND Filter", () => {
    it("should work with age exact match using range conditions", () => {
        const ageExactFilter = userEntity.filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageExactFilter(exampleUsers, {
            ageExact: 30, // >= 30 AND <= 30 means exactly 30
        });

        // Only John is exactly 30
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with score range conditions", () => {
        const scoreRangeFilter = userEntity.filterDef({
            scoreRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                ],
            },
        });

        const result = scoreRangeFilter(exampleUsers, {
            scoreRange: 85,
        });

        // Only John has score exactly 85
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with multiple numeric comparisons on same field", () => {
        const ageFilter = userEntity.filterDef({
            ageNotInRange: {
                kind: "and",
                conditions: [
                    { kind: "gt", field: "age" },
                    { kind: "lt", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {
            ageNotInRange: 30,
        });

        // Nobody can be both > 30 AND < 30 simultaneously
        expect(result).toEqual([]);
    });

    it("should return all when filter value is undefined", () => {
        const ageFilter = userEntity.filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });
});

describe("Boolean OR Filter", () => {
    it("should find values outside a range", () => {
        const ageOutsideRangeFilter = userEntity.filterDef({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = ageOutsideRangeFilter(exampleUsers, {
            youngOrOld: 28,
        });

        // Jane (25 < 28), John (30 > 28), and Bob (40 > 28)
        // Alice is exactly 28, so excluded
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[2],
        ]);
    });

    it("should work with score threshold OR conditions", () => {
        const scoreFilter = userEntity.filterDef({
            extremeScores: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "score" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        const result = scoreFilter(exampleUsers, {
            extremeScores: 85,
        });

        // Bob (78 < 85), Jane (92 > 85), Alice (88 > 85)
        // John is exactly 85, so excluded
        expect(result).toEqual([
            exampleUsers[1],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should work with string contains on multiple fields", () => {
        const stringFilter = userEntity.filterDef({
            containsInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const result = stringFilter(exampleUsers, {
            containsInNameOrEmail: "Doe",
        });

        // John and Jane have "Doe" in name
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should return all when filter value is undefined", () => {
        const ageFilter = userEntity.filterDef({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });
});

describe("Complex Boolean Filters", () => {
    it("should support multiple boolean filters together", () => {
        const complexFilter = userEntity.filterDef({
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

        const result = complexFilter(exampleUsers, {
            ageExact: 30,
            scoreExact: 85,
        });

        // Only John is 30 years old with score of 85
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should combine boolean filter with primitive filters", () => {
        const mixedFilter = userEntity.filterDef({
            nameContains: { kind: "contains", field: "name" },
            ageOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = mixedFilter(exampleUsers, {
            nameContains: "Doe",
            ageOutsideRange: 27,
        });

        // Jane Doe is 25 (< 27) and John Doe is 30 (> 27)
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should handle three numeric conditions in AND on same field", () => {
        const tripleAndFilter = userEntity.filterDef({
            scoreInRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                    { kind: "equals", field: "score" },
                ],
            },
        });

        const result = tripleAndFilter(exampleUsers, {
            scoreInRange: 85,
        });

        // Only John has score exactly 85
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should handle three conditions in OR on same field", () => {
        const tripleOrFilter = userEntity.filterDef({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "equals", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = tripleOrFilter(exampleUsers, {
            ageMatch: 30,
        });

        // Everyone matches: Jane & Alice (< 30), John (== 30), Bob (> 30)
        expect(result).toEqual(exampleUsers);
    });

    it("should work with string matching across multiple fields", () => {
        const stringFilter = userEntity.filterDef({
            matchInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const result = stringFilter(exampleUsers, {
            matchInNameOrEmail: "smith",
        });

        // Bob Smith has "smith" in name and email
        expect(result).toEqual([exampleUsers[2]]);
    });
});

describe("Boolean Filter Edge Cases", () => {
    it("should handle empty array with boolean filters", () => {
        const ageFilter = userEntity.filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageFilter([], {
            ageExact: 30,
        });

        expect(result).toEqual([]);
    });

    it("should handle undefined filter values for boolean filters", () => {
        const ageFilter = userEntity.filterDef({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });

    it("should apply both AND and OR filters together", () => {
        const combinedFilter = userEntity.filterDef({
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

        const result = combinedFilter(exampleUsers, {
            ageExact: 30,
            scoreOutsideRange: 85,
        });

        // John is 30 but score is exactly 85, so excluded by scoreOutsideRange
        expect(result).toEqual([]);
    });

    it("should work with multiple OR conditions on same field", () => {
        const ageFilter = userEntity.filterDef({
            ageMatch: {
                kind: "or",
                conditions: [
                    { kind: "equals", field: "age" },
                    { kind: "equals", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {
            ageMatch: 30,
        });

        // Duplicate conditions still work - finds John with age 30
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with inArray in OR boolean filters", () => {
        const arrayFilter = userEntity.filterDef({
            ageInArrays: {
                kind: "or",
                conditions: [
                    { kind: "inArray", field: "age" },
                    { kind: "inArray", field: "score" },
                ],
            },
        });

        const result = arrayFilter(exampleUsers, {
            ageInArrays: [25, 30],
        });

        // Age matches for John (30) and Jane (25)
        // Score doesn't match anyone (no one has score of 25 or 30)
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });
});

describe("Edge Cases", () => {
    const userFilter = userEntity.filterDef({
        nameEquals: { kind: "equals", field: "name" },
        emailContains: { kind: "contains", field: "email" },
        ageGreaterThan: { kind: "gt", field: "age" },
    });

    it("should handle empty entities array", () => {
        const result = userFilter([], {
            nameEquals: "John Doe",
        });

        expect(result).toEqual([]);
    });

    it("should handle empty filter input", () => {
        const result = userFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });

    it("should handle partial filter input", () => {
        const result = userFilter(exampleUsers, {
            nameEquals: "John Doe",
        });

        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should handle zero in numeric comparisons", () => {
        const result = userFilter(exampleUsers, {
            ageGreaterThan: 0,
        });

        expect(result).toEqual(exampleUsers);
    });

    it("should handle empty string in contains filter", () => {
        const result = userFilter(exampleUsers, {
            emailContains: "",
        });

        expect(result).toEqual(exampleUsers);
    });
});
