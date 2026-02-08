import { describe, expect, expectTypeOf, it } from "vitest";
import type {
    BigQueryFilterInput,
    BigQueryFilterResult,
} from "./bigquery-filter.ts";
import { bigqueryFilter } from "./bigquery-filter.ts";
// ----------------------------------------------------------------
// Test Entity
// ----------------------------------------------------------------

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    phone: string | null;
    isActive: number;
    score: number;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("Eq Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        nameEq: { kind: "eq", field: "name" },
        ageEq: { kind: "eq", field: "age" },
    });

    it("should generate SQL for exact string match", () => {
        const result = userFilter({ nameEq: "John Doe" });

        expect(result).toEqual({
            sql: "name = @nameEq",
            params: { nameEq: "John Doe" },
        });
    });

    it("should generate SQL for exact number match", () => {
        const result = userFilter({ ageEq: 30 });

        expect(result).toEqual({
            sql: "age = @ageEq",
            params: { ageEq: 30 },
        });
    });

    it("should combine multiple eq filters with AND", () => {
        const result = userFilter({ nameEq: "John Doe", ageEq: 30 });

        expect(result).toEqual({
            sql: "name = @nameEq AND age = @ageEq",
            params: { nameEq: "John Doe", ageEq: 30 },
        });
    });

    it("should return true condition when no filter values provided", () => {
        const result = userFilter({});
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should return true condition when filter input is undefined", () => {
        const result = userFilter(undefined);
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            ageEq?: number;
        }>();
    });
});

describe("Neq Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        nameNeq: { kind: "neq", field: "name" },
        ageNeq: { kind: "neq", field: "age" },
    });

    it("should generate SQL for not equal string match", () => {
        const result = userFilter({ nameNeq: "John Doe" });

        expect(result).toEqual({
            sql: "name != @nameNeq",
            params: { nameNeq: "John Doe" },
        });
    });

    it("should generate SQL for not equal number match", () => {
        const result = userFilter({ ageNeq: 30 });

        expect(result).toEqual({
            sql: "age != @ageNeq",
            params: { ageNeq: 30 },
        });
    });

    it("should combine multiple neq filters with AND", () => {
        const result = userFilter({ nameNeq: "John Doe", ageNeq: 25 });

        expect(result).toEqual({
            sql: "name != @nameNeq AND age != @ageNeq",
            params: { nameNeq: "John Doe", ageNeq: 25 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameNeq?: string;
            ageNeq?: number;
        }>();
    });
});

describe("Contains Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        emailContains: { kind: "contains", field: "email" },
        iEmailContains: {
            kind: "contains",
            field: "email",
            caseInsensitive: true,
        },
        nameContains: { kind: "contains", field: "name" },
    });

    it("should generate SQL for substring match with LIKE", () => {
        const result = userFilter({ emailContains: "example.com" });

        expect(result).toEqual({
            sql: "email LIKE @emailContains",
            params: { emailContains: "%example.com%" },
        });
    });

    it("should generate case-insensitive SQL with LOWER", () => {
        const result = userFilter({ iEmailContains: ".OrG" });

        expect(result).toEqual({
            sql: "LOWER(email) LIKE LOWER(@iEmailContains)",
            params: { iEmailContains: "%.OrG%" },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            emailContains?: string;
            iEmailContains?: string;
            nameContains?: string;
        }>();
    });
});

describe("InArray Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        ageInArray: { kind: "inArray", field: "age" },
        nameInArray: { kind: "inArray", field: "name" },
    });

    it("should generate SQL with IN UNNEST for array", () => {
        const result = userFilter({ ageInArray: [25, 30] });

        expect(result).toEqual({
            sql: "age IN UNNEST(@ageInArray)",
            params: { ageInArray: [25, 30] },
        });
    });

    it("should work with single-element array", () => {
        const result = userFilter({ ageInArray: [40] });

        expect(result).toEqual({
            sql: "age IN UNNEST(@ageInArray)",
            params: { ageInArray: [40] },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageInArray?: number[];
            nameInArray?: string[];
        }>();
    });
});

describe("IsNull Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        phoneIsNull: { kind: "isNull", field: "phone" },
    });

    it("should generate IS NULL when filter is true", () => {
        const result = userFilter({ phoneIsNull: true });

        expect(result).toEqual({
            sql: "phone IS NULL",
            params: {},
        });
    });

    it("should generate IS NOT NULL when filter is false", () => {
        const result = userFilter({ phoneIsNull: false });

        expect(result).toEqual({
            sql: "phone IS NOT NULL",
            params: {},
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNull?: boolean;
        }>();
    });
});

describe("IsNotNull Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should generate IS NOT NULL when filter is true", () => {
        const result = userFilter({ phoneIsNotNull: true });

        expect(result).toEqual({
            sql: "phone IS NOT NULL",
            params: {},
        });
    });

    it("should generate IS NULL when filter is false", () => {
        const result = userFilter({ phoneIsNotNull: false });

        expect(result).toEqual({
            sql: "phone IS NULL",
            params: {},
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            phoneIsNotNull?: boolean;
        }>();
    });
});

describe("Greater Than (GT) Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        ageGreaterThan: { kind: "gt", field: "age" },
        scoreGreaterThan: { kind: "gt", field: "score" },
    });

    it("should generate SQL with > operator", () => {
        const result = userFilter({ ageGreaterThan: 28 });

        expect(result).toEqual({
            sql: "age > @ageGreaterThan",
            params: { ageGreaterThan: 28 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThan?: number;
            scoreGreaterThan?: number;
        }>();
    });
});

describe("Greater Than or Equal (GTE) Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        ageGreaterThanOrEqual: { kind: "gte", field: "age" },
        scoreGreaterThanOrEqual: { kind: "gte", field: "score" },
    });

    it("should generate SQL with >= operator", () => {
        const result = userFilter({ ageGreaterThanOrEqual: 30 });

        expect(result).toEqual({
            sql: "age >= @ageGreaterThanOrEqual",
            params: { ageGreaterThanOrEqual: 30 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageGreaterThanOrEqual?: number;
            scoreGreaterThanOrEqual?: number;
        }>();
    });
});

describe("Less Than (LT) Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        ageLessThan: { kind: "lt", field: "age" },
        scoreLessThan: { kind: "lt", field: "score" },
    });

    it("should generate SQL with < operator", () => {
        const result = userFilter({ ageLessThan: 30 });

        expect(result).toEqual({
            sql: "age < @ageLessThan",
            params: { ageLessThan: 30 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThan?: number;
            scoreLessThan?: number;
        }>();
    });
});

describe("Less Than or Equal (LTE) Filter", () => {
    const userFilter = bigqueryFilter<User>().def({
        ageLessThanOrEqual: { kind: "lte", field: "age" },
        scoreLessThanOrEqual: { kind: "lte", field: "score" },
    });

    it("should generate SQL with <= operator", () => {
        const result = userFilter({ ageLessThanOrEqual: 28 });

        expect(result).toEqual({
            sql: "age <= @ageLessThanOrEqual",
            params: { ageLessThanOrEqual: 28 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageLessThanOrEqual?: number;
            scoreLessThanOrEqual?: number;
        }>();
    });
});

describe("Combined Filters", () => {
    const userFilter = bigqueryFilter<User>().def({
        nameContains: { kind: "contains", field: "name" },
        ageGreaterThan: { kind: "gt", field: "age" },
        ageLessThan: { kind: "lt", field: "age" },
        isActive: { kind: "eq", field: "isActive" },
        phoneIsNotNull: { kind: "isNotNull", field: "phone" },
    });

    it("should combine all filters with AND logic", () => {
        const result = userFilter({
            nameContains: "Doe",
            ageGreaterThan: 24,
            ageLessThan: 31,
            isActive: 1,
            phoneIsNotNull: true,
        });

        expect(result).toEqual({
            sql: "name LIKE @nameContains AND age > @ageGreaterThan AND age < @ageLessThan AND isActive = @isActive AND phone IS NOT NULL",
            params: {
                nameContains: "%Doe%",
                ageGreaterThan: 24,
                ageLessThan: 31,
                isActive: 1,
            },
        });
    });

    it("should support partial filtering", () => {
        const result = userFilter({
            nameContains: "Smith",
            isActive: 0,
        });

        expect(result).toEqual({
            sql: "name LIKE @nameContains AND isActive = @isActive",
            params: { nameContains: "%Smith%", isActive: 0 },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

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
    it("should generate AND conditions with indexed params", () => {
        const ageExactFilter = bigqueryFilter<User>().def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageExactFilter({ ageExact: 30 });

        expect(result).toEqual({
            sql: "(age >= @ageExact_0 AND age <= @ageExact_1)",
            params: { ageExact_0: 30, ageExact_1: 30 },
        });
    });

    it("should work with multiple numeric comparisons on same field", () => {
        const ageFilter = bigqueryFilter<User>().def({
            ageNotInRange: {
                kind: "and",
                conditions: [
                    { kind: "gt", field: "age" },
                    { kind: "lt", field: "age" },
                ],
            },
        });

        const result = ageFilter({ ageNotInRange: 30 });

        expect(result).toEqual({
            sql: "(age > @ageNotInRange_0 AND age < @ageNotInRange_1)",
            params: { ageNotInRange_0: 30, ageNotInRange_1: 30 },
        });
    });

    it("should return true condition when filter value is undefined", () => {
        const ageFilter = bigqueryFilter<User>().def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        const result = ageFilter({});
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should infer the correct input type", () => {
        const ageFilter = bigqueryFilter<User>().def({
            ageExact: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "age" },
                    { kind: "lte", field: "age" },
                ],
            },
        });

        type Input = BigQueryFilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
        }>();
    });
});

describe("Boolean OR Filter", () => {
    it("should generate OR conditions with indexed params", () => {
        const ageOutsideRangeFilter = bigqueryFilter<User>().def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = ageOutsideRangeFilter({ youngOrOld: 28 });

        expect(result).toEqual({
            sql: "(age < @youngOrOld_0 OR age > @youngOrOld_1)",
            params: { youngOrOld_0: 28, youngOrOld_1: 28 },
        });
    });

    it("should work with string contains on multiple fields", () => {
        const stringFilter = bigqueryFilter<User>().def({
            containsInNameOrEmail: {
                kind: "or",
                conditions: [
                    { kind: "contains", field: "name" },
                    { kind: "contains", field: "email" },
                ],
            },
        });

        const result = stringFilter({ containsInNameOrEmail: "Doe" });

        expect(result).toEqual({
            sql: "(name LIKE @containsInNameOrEmail_0 OR email LIKE @containsInNameOrEmail_1)",
            params: {
                containsInNameOrEmail_0: "%Doe%",
                containsInNameOrEmail_1: "%Doe%",
            },
        });
    });

    it("should return true condition when filter value is undefined", () => {
        const ageFilter = bigqueryFilter<User>().def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = ageFilter({});
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should infer the correct input type", () => {
        const ageFilter = bigqueryFilter<User>().def({
            youngOrOld: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        type Input = BigQueryFilterInput<typeof ageFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            youngOrOld?: number;
        }>();
    });
});

describe("Complex Boolean Filters", () => {
    it("should support multiple boolean filters together", () => {
        const complexFilter = bigqueryFilter<User>().def({
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

        const result = complexFilter({ ageExact: 30, scoreExact: 85 });

        expect(result).toEqual({
            sql: "(age >= @ageExact_0 AND age <= @ageExact_1) AND (score >= @scoreExact_0 AND score <= @scoreExact_1)",
            params: {
                ageExact_0: 30,
                ageExact_1: 30,
                scoreExact_0: 85,
                scoreExact_1: 85,
            },
        });
    });

    it("should combine boolean filter with primitive filters", () => {
        const mixedFilter = bigqueryFilter<User>().def({
            nameContains: { kind: "contains", field: "name" },
            ageOutsideRange: {
                kind: "or",
                conditions: [
                    { kind: "lt", field: "age" },
                    { kind: "gt", field: "age" },
                ],
            },
        });

        const result = mixedFilter({
            nameContains: "Doe",
            ageOutsideRange: 27,
        });

        expect(result).toEqual({
            sql: "name LIKE @nameContains AND (age < @ageOutsideRange_0 OR age > @ageOutsideRange_1)",
            params: {
                nameContains: "%Doe%",
                ageOutsideRange_0: 27,
                ageOutsideRange_1: 27,
            },
        });
    });

    it("should handle three numeric conditions in AND on same field", () => {
        const tripleAndFilter = bigqueryFilter<User>().def({
            scoreInRange: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "score" },
                    { kind: "lte", field: "score" },
                    { kind: "eq", field: "score" },
                ],
            },
        });

        const result = tripleAndFilter({ scoreInRange: 85 });

        expect(result).toEqual({
            sql: "(score >= @scoreInRange_0 AND score <= @scoreInRange_1 AND score = @scoreInRange_2)",
            params: {
                scoreInRange_0: 85,
                scoreInRange_1: 85,
                scoreInRange_2: 85,
            },
        });
    });

    it("should infer the correct input type", () => {
        const complexFilter = bigqueryFilter<User>().def({
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

        type Input = BigQueryFilterInput<typeof complexFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageExact?: number;
            scoreExact?: number;
        }>();
    });
});

describe("Custom Filters", () => {
    it("should work with custom SQL filter", () => {
        const userFilter = bigqueryFilter<User>().def({
            ageDivisibleBy: (divisor: number): BigQueryFilterResult => ({
                sql: "MOD(age, @divisor) = 0",
                params: { divisor },
            }),
        });

        const result = userFilter({ ageDivisibleBy: 10 });

        expect(result).toEqual({
            sql: "MOD(age, @divisor) = 0",
            params: { divisor: 10 },
        });
    });

    it("should work with custom filter that conditionally applies", () => {
        const userFilter = bigqueryFilter<User>().def({
            optionalAgeFilter: (val: number | "all"): BigQueryFilterResult =>
                val === "all"
                    ? { sql: "true", params: {} }
                    : { sql: "age = @age", params: { age: val } },
        });

        const result = userFilter({ optionalAgeFilter: "all" });
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should combine custom filters with primitive filters", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
            ageDivisibleBy: (divisor: number): BigQueryFilterResult => ({
                sql: "MOD(age, @divisor) = 0",
                params: { divisor },
            }),
        });

        const result = userFilter({ name: "John", ageDivisibleBy: 5 });

        expect(result).toEqual({
            sql: "name = @name AND MOD(age, @divisor) = 0",
            params: { name: "John", divisor: 5 },
        });
    });

    it("should infer the correct input type for custom filters", () => {
        const userFilter = bigqueryFilter<User>().def({
            ageDivisibleBy: (divisor: number): BigQueryFilterResult => ({
                sql: "MOD(age, @divisor) = 0",
                params: { divisor },
            }),
            optionalFilter: (val: string | null): BigQueryFilterResult =>
                val
                    ? { sql: "name = @name", params: { name: val } }
                    : { sql: "true", params: {} },
        });

        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            ageDivisibleBy?: number;
            optionalFilter?: string | null;
        }>();
    });
});

describe("Edge Cases", () => {
    const userFilter = bigqueryFilter<User>().def({
        nameEq: { kind: "eq", field: "name" },
        emailContains: { kind: "contains", field: "email" },
        ageGreaterThan: { kind: "gt", field: "age" },
    });

    it("should handle empty filter input", () => {
        const result = userFilter({});
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should handle undefined filter input", () => {
        const result = userFilter(undefined);
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should handle partial filter input", () => {
        const result = userFilter({ nameEq: "John Doe" });

        expect(result).toEqual({
            sql: "name = @nameEq",
            params: { nameEq: "John Doe" },
        });
    });

    it("should handle zero in numeric comparisons", () => {
        const result = userFilter({ ageGreaterThan: 0 });

        expect(result).toEqual({
            sql: "age > @ageGreaterThan",
            params: { ageGreaterThan: 0 },
        });
    });

    it("should handle empty string in contains filter", () => {
        const result = userFilter({ emailContains: "" });

        expect(result).toEqual({
            sql: "email LIKE @emailContains",
            params: { emailContains: "%%" },
        });
    });

    it("should infer the correct input type", () => {
        type Input = BigQueryFilterInput<typeof userFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            nameEq?: string;
            emailContains?: string;
            ageGreaterThan?: number;
        }>();
    });
});

describe("Field Inference", () => {
    it("should infer field from filter key when not specified", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
            age: { kind: "gte" },
        });

        const result = userFilter({ name: "John Doe", age: 30 });

        expect(result).toEqual({
            sql: "name = @name AND age >= @age",
            params: { name: "John Doe", age: 30 },
        });
    });

    it("should use explicit field over key", () => {
        const userFilter = bigqueryFilter<User>().def({
            emailContains: { kind: "contains", field: "email" },
            nameSearch: { kind: "contains", field: "name" },
        });

        const result = userFilter({
            emailContains: "example.com",
            nameSearch: "Doe",
        });

        expect(result).toEqual({
            sql: "email LIKE @emailContains AND name LIKE @nameSearch",
            params: { emailContains: "%example.com%", nameSearch: "%Doe%" },
        });
    });
});

describe("SQL Output Verification", () => {
    it("should return true condition when no filters applied", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
        });

        const result = userFilter({});
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should return true condition when filter input is undefined", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
        });

        const result = userFilter(undefined);
        expect(result).toEqual({ sql: "true", params: {} });
    });

    it("should return result when filter is applied", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
        });

        const result = userFilter({ name: "John" });
        expect(result).toBeDefined();
        expect(result?.sql).toBe("name = @name");
        expect(result?.params).toEqual({ name: "John" });
    });
});

describe("BigQuery Integration Usage Pattern", () => {
    it("should produce output compatible with @google-cloud/bigquery", () => {
        const userFilter = bigqueryFilter<User>().def({
            name: { kind: "eq" },
            minAge: { kind: "gte", field: "age" },
            maxAge: { kind: "lte", field: "age" },
        });

        const result = userFilter({ name: "John", minAge: 18, maxAge: 65 });

        // This is the format @google-cloud/bigquery expects
        expect(result).toEqual({
            sql: "name = @name AND age >= @minAge AND age <= @maxAge",
            params: { name: "John", minAge: 18, maxAge: 65 },
        });

        // Usage pattern:
        // const [rows] = await bigquery.query({
        //     query: `SELECT * FROM \`myproject.dataset.users\` WHERE ${result.sql}`,
        //     params: result.params,
        // });
    });
});

describe("Nested field filtering", () => {
    interface UserWithAddress {
        name: { first: string; last: string };
        address: { city: string; geo: { lat: number; lng: number } };
    }

    it("eq on nested field produces dot-path SQL with sanitized param", () => {
        const filter = bigqueryFilter<UserWithAddress>().def({
            firstName: { kind: "eq", field: "name.first" },
        });
        const result = filter({ firstName: "Alice" });
        expect(result).toEqual({
            sql: "name.first = @firstName",
            params: { firstName: "Alice" },
        });
    });

    it("eq using key-as-path sanitizes param key", () => {
        const filter = bigqueryFilter<UserWithAddress>().def({
            "name.first": { kind: "eq" },
        });
        const result = filter({ "name.first": "Bob" });
        expect(result).toEqual({
            sql: "name.first = @name_first",
            params: { name_first: "Bob" },
        });
    });

    it("contains on nested field", () => {
        const filter = bigqueryFilter<UserWithAddress>().def({
            cityContains: {
                kind: "contains",
                field: "address.city",
                caseInsensitive: true,
            },
        });
        const result = filter({ cityContains: "port" });
        expect(result).toEqual({
            sql: "LOWER(address.city) LIKE LOWER(@cityContains)",
            params: { cityContains: "%port%" },
        });
    });

    it("gt on deeply nested field", () => {
        const filter = bigqueryFilter<UserWithAddress>().def({
            latAbove: { kind: "gt", field: "address.geo.lat" },
        });
        const result = filter({ latAbove: 46 });
        expect(result).toEqual({
            sql: "address.geo.lat > @latAbove",
            params: { latAbove: 46 },
        });
    });

    it("type-checks: nested field input has correct type", () => {
        const filter = bigqueryFilter<UserWithAddress>().def({
            firstName: { kind: "eq", field: "name.first" },
        });
        type Input = BigQueryFilterInput<typeof filter>;
        expectTypeOf<Input["firstName"]>().toEqualTypeOf<string | undefined>();
    });
});
