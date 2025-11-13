import { describe, expect, it } from "vitest";
import { entity } from "./philter";

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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
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
    const userFilter = userEntity.philter({
        activeWithPhone: {
            kind: "and",
            conditions: [
                { kind: "equals", field: "isActive" },
                { kind: "isNotNull", field: "phone" },
            ],
        },
    });

    it("should pass when all AND conditions are met", () => {
        const result = userFilter(exampleUsers, {
            activeWithPhone: true,
        });

        // John and Alice are active with phones
        expect(result).toEqual([exampleUsers[0], exampleUsers[3]]);
    });

    it("should fail when any AND condition is not met", () => {
        // With false: isActive === false AND phone isNotNull === false (phone IS null)
        // This means: inactive AND no phone = no one matches
        const result = userFilter(exampleUsers, {
            activeWithPhone: false,
        });

        expect(result).toEqual([]);
    });

    it("should work with age range AND conditions", () => {
        const ageRangeFilter = userEntity.philter({
            ageRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageRangeFilter(exampleUsers, {
            ageRange: 30, // Using 30 for both conditions
        });

        // Only John is exactly 30 (>= 30 AND <= 30)
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should work with multiple fields in AND", () => {
        const multiFieldFilter = userEntity.philter({
            highScoreAndActive: {
                kind: "and",
                conditions: [
                    { kind: "gt", field: "score" },
                    { kind: "equals", field: "isActive" },
                ],
            },
        });

        const result = multiFieldFilter(exampleUsers, {
            highScoreAndActive: true,
        });

        // With true: score > true (treated as 1) AND isActive === true
        // All active users have scores > 1
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[3],
        ]);
    });

    it("should return all when filter value is undefined", () => {
        const result = userFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });
});

describe("Boolean OR Filter", () => {
    const userFilter = userEntity.philter({
        activeOrHasPhone: {
            kind: "or",
            conditions: [
                { kind: "equals", field: "isActive" },
                { kind: "isNotNull", field: "phone" },
            ],
        },
    });

    it("should pass when any OR condition is met", () => {
        const result = userFilter(exampleUsers, {
            activeOrHasPhone: true,
        });

        // Everyone except Bob meets at least one condition:
        // John: active AND has phone
        // Jane: active but no phone
        // Bob: not active but has phone
        // Alice: active AND has phone
        expect(result).toEqual(exampleUsers);
    });

    it("should fail when no OR conditions are met", () => {
        const result = userFilter(exampleUsers, {
            activeOrHasPhone: false,
        });

        // With false: isActive === false OR phone isNotNull === false (phone IS null)
        // Bob (inactive) OR Jane (no phone)
        expect(result).toEqual([exampleUsers[1], exampleUsers[2]]);
    });

    it("should work with age OR conditions", () => {
        const ageFilter = userEntity.philter({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = ageFilter(exampleUsers, {
            youngOrOld: 28,
        });

        // Jane (25 < 28) and John (30 > 28) and Bob (40 > 28)
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[2],
        ]);
    });

    it("should work with contains OR equals", () => {
        const nameFilter = userEntity.philter({
            doeOrSmith: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const result = nameFilter(exampleUsers, {
            doeOrSmith: "Doe",
        });

        // John and Jane have "Doe" in name
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should return all when filter value is undefined", () => {
        const result = userFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });
});

describe("Complex Boolean Filters", () => {
    it("should support multiple boolean filters together", () => {
        const complexFilter = userEntity.philter({
            activeAndHasPhone: {
                kind: "and",
                conditions: [
                    { kind: "equals", field: "isActive" },
                    { kind: "isNotNull", field: "phone" },
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

        const result = complexFilter(exampleUsers, {
            activeAndHasPhone: true,
            ageRange: 30,
        });

        // Only John meets both criteria
        expect(result).toEqual([exampleUsers[0]]);
    });

    it("should combine boolean filter with primitive filters", () => {
        const mixedFilter = userEntity.philter({
            nameContains: { kind: "contains", field: "name" },
            activeOrHighScore: {
                kind: "or",
                conditions: [
                    { kind: "equals", field: "isActive" },
                    { kind: "gt", field: "score" },
                ],
            },
        });

        const result = mixedFilter(exampleUsers, {
            nameContains: "Doe",
            activeOrHighScore: true,
        });

        // Both Does are active
        expect(result).toEqual([exampleUsers[0], exampleUsers[1]]);
    });

    it("should handle three conditions in AND", () => {
        const tripleAndFilter = userEntity.philter({
            perfectMatch: {
                kind: "and",
                conditions: [
                    { kind: "equals", field: "isActive" },
                    { kind: "isNotNull", field: "phone" },
                    { kind: "gte", field: "score" },
                ],
            },
        });

        const result = tripleAndFilter(exampleUsers, {
            perfectMatch: true,
        });

        // With true: isActive === true AND phone isNotNull === true AND score >= true (1)
        // John and Alice are active with phones and scores >= 1
        expect(result).toEqual([exampleUsers[0], exampleUsers[3]]);
    });

    it("should handle three conditions in OR", () => {
        const tripleOrFilter = userEntity.philter({
            anyMatch: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                    { kind: "equals", field: "name" },
                ],
            },
        });

        const result = tripleOrFilter(exampleUsers, {
            anyMatch: 30,
        });

        // Jane (25 < 30), Bob (40 > 30), Alice (28 < 30)
        // John (30 == 30) fails lt and gt, but name != 30
        expect(result).toEqual([
            exampleUsers[1],
            exampleUsers[2],
            exampleUsers[3],
        ]);
    });

    it("should work with email domain filtering using OR", () => {
        const domainFilter = userEntity.philter({
            exampleOrSmithDomain: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "email" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const result = domainFilter(exampleUsers, {
            exampleOrSmithDomain: "example.com",
        });

        // John, Jane, and Alice have example.com emails
        expect(result).toEqual([
            exampleUsers[0],
            exampleUsers[1],
            exampleUsers[3],
        ]);
    });
});

describe("Boolean Filter Edge Cases", () => {
    const userFilter = userEntity.philter({
        andFilter: {
            kind: "and",
            conditions: [
                { kind: "equals", field: "isActive" },
                { kind: "isNotNull", field: "phone" },
            ],
        },
        orFilter: {
            kind: "or",
            conditions: [
                { kind: "equals", field: "isActive" },
                { kind: "isNotNull", field: "phone" },
            ],
        },
    });

    it("should handle empty array with boolean filters", () => {
        const result = userFilter([], {
            andFilter: true,
        });

        expect(result).toEqual([]);
    });

    it("should handle undefined filter values for boolean filters", () => {
        const result = userFilter(exampleUsers, {});

        expect(result).toEqual(exampleUsers);
    });

    it("should apply both AND and OR filters together", () => {
        const result = userFilter(exampleUsers, {
            andFilter: true,
            orFilter: false,
        });

        // andFilter: true means active AND has phone (John, Alice)
        // orFilter: false means NOT (active OR has phone) = not active AND no phone (none)
        // Intersection of these is empty
        expect(result).toEqual([]);
    });

    it("should work with isNull in boolean filters", () => {
        const nullCheckFilter = userEntity.philter({
            inactiveWithoutPhone: {
                kind: "and",
                conditions: [
                    { kind: "equals", field: "isActive" },
                    { kind: "isNull", field: "phone" },
                ],
            },
        });

        const result = nullCheckFilter(exampleUsers, {
            inactiveWithoutPhone: true,
        });

        // With true: isActive === true AND phone isNull === true (phone IS null)
        // Active without phone = only Jane
        expect(result).toEqual([exampleUsers[1]]);
    });

    it("should work with inArray in boolean filters", () => {
        const arrayFilter = userEntity.philter({
            specificAgesAndActive: {
                kind: "and",
                conditions: [
                    { kind: "inArray", field: "age" },
                    { kind: "equals", field: "isActive" },
                ],
            },
        });

        const result = arrayFilter(exampleUsers, {
            specificAgesAndActive: [25, 30],
        });

        // With [25, 30]: age inArray [25, 30] AND isActive === [25, 30]
        // Age matches for John (30) and Jane (25), but isActive === [25, 30] is false for both
        // This demonstrates that boolean filters work best when all conditions use the same value type
        expect(result).toEqual([]);
    });
});

describe("Edge Cases", () => {
    const userFilter = userEntity.philter({
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
