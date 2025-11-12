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
