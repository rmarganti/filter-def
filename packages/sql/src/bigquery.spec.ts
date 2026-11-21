import { describe, expect, expectTypeOf, it } from "vitest";
import type { SqlFilterInput, SqlFragment } from "./bigquery.ts";
import { sql, sqlFilter } from "./bigquery.ts";

interface Employee {
    name: string;
    age: number;
    order: number;
    address: { city: string; geo: { lat: number } };
}

const render = (where: SqlFragment) => {
    const { query, params } = sql`${where}`;
    return { query, params };
};

describe("bigquery SQL output", () => {
    const employeeFilter = sqlFilter<Employee>().def({
        name: { kind: "eq" },
        order: { kind: "eq" },
        ageIn: { kind: "inArray", field: "age" },
        city: { kind: "contains", field: "address.city" },
        cityCi: {
            kind: "contains",
            field: "address.city",
            caseInsensitive: true,
        },
        minLat: { kind: "gte", field: "address.geo.lat" },
        search: {
            kind: "or",
            conditions: [
                { kind: "contains", field: "name" },
                { kind: "contains", field: "address.city" },
            ],
        },
        custom: (n: number) => sql`MOD(age, ${n}) = 0 OR age = ${n}`,
    });

    it("uses named @pN params across the whole query", () => {
        const where = employeeFilter({ name: "Bob", minLat: 40 });
        const query = sql`SELECT * FROM \`p.d.employees\` WHERE org_id = ${7} AND ${where}`;

        expect(query.query).toBe(
            "SELECT * FROM `p.d.employees` WHERE org_id = @p0 AND (`name` = @p1 AND `address`.`geo`.`lat` >= @p2)",
        );
        expect(query.params).toEqual({ p0: 7, p1: "Bob", p2: 40 });
    });

    it("quotes reserved words", () => {
        expect(render(employeeFilter({ order: 1 })).query).toBe(
            "`order` = @p0",
        );
    });

    it("uses IN UNNEST for inArray", () => {
        expect(render(employeeFilter({ ageIn: [1, 2] }))).toEqual({
            query: "`age` IN UNNEST(@p0)",
            params: { p0: [1, 2] },
        });
    });

    it("uses FALSE for an empty inArray", () => {
        expect(render(employeeFilter({ ageIn: [] })).query).toBe("FALSE");
    });

    it("escapes LIKE wildcards in contains", () => {
        expect(render(employeeFilter({ city: "a_b%c\\" }))).toEqual({
            query: "`address`.`city` LIKE @p0",
            params: { p0: "%a\\_b\\%c\\\\%" },
        });
    });

    it("lowercases both sides for caseInsensitive contains", () => {
        expect(render(employeeFilter({ cityCi: "NYC" })).query).toBe(
            "LOWER(`address`.`city`) LIKE LOWER(@p0)",
        );
    });

    it("groups or conditions", () => {
        expect(render(employeeFilter({ search: "x", order: 1 })).query).toBe(
            "(`order` = @p0 AND (`name` LIKE @p1 OR `address`.`city` LIKE @p2))",
        );
    });

    it("wraps custom filters in parentheses", () => {
        expect(render(employeeFilter({ custom: 3, order: 1 }))).toEqual({
            query: "(`order` = @p0 AND (MOD(age, @p1) = 0 OR age = @p2))",
            params: { p0: 1, p1: 3, p2: 3 },
        });
    });

    it("renders TRUE when no filters apply", () => {
        expect(render(employeeFilter()).query).toBe("TRUE");
    });

    it("escapes backticks in identifiers", () => {
        const filter = sqlFilter<Employee>({ columns: { name: "we`ird" } }).def(
            { name: { kind: "eq" } },
        );
        expect(render(filter({ name: "x" })).query).toBe("`we\\`ird` = @p0");
    });

    it("only exposes driver keys", () => {
        expect(Object.keys(sql`SELECT ${1}`)).toEqual(["query", "params"]);
    });

    it("infers input types", () => {
        type Input = SqlFilterInput<typeof employeeFilter>;

        expectTypeOf<Input>().toEqualTypeOf<{
            name?: string;
            order?: number;
            ageIn?: number[];
            city?: string;
            cityCi?: string;
            minLat?: number;
            search?: string;
            custom?: number;
        }>();
    });

    it("rejects unknown columns in the columns option", () => {
        // @ts-expect-error `nope` is not a field of Employee
        sqlFilter<Employee>({ columns: { nope: "x" } });
    });
});
