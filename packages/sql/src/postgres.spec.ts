import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { SqlFragment } from "./postgres.ts";
import { sql, sqlFilter } from "./postgres.ts";
import type { User } from "./testing/integration-suite.ts";
import {
    exampleUsers,
    runIntegrationSuite,
} from "./testing/integration-suite.ts";

// ----------------------------------------------------------------
// Setup
// ----------------------------------------------------------------

let client: PGlite;

beforeAll(async () => {
    client = new PGlite();

    await client.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT,
            is_active INTEGER NOT NULL,
            score INTEGER NOT NULL,
            "order" INTEGER NOT NULL
        )
    `);

    for (const u of exampleUsers) {
        const insert = sql`INSERT INTO users VALUES (${u.id}, ${u.name}, ${u.email}, ${u.age}, ${u.phone}, ${u.isActive}, ${u.score}, ${u.order})`;
        await client.query(insert.text, insert.values);
    }
});

// ----------------------------------------------------------------
// Integration
// ----------------------------------------------------------------

describe("postgres integration", () => {
    runIntegrationSuite({
        sqlFilter,
        caseSensitiveLike: true,
        idOneOrTwo: sql`id = 1 OR id = 2`,
        selectIds: async (where) => {
            const query = sql`SELECT id FROM users WHERE id > ${0} AND ${where} AND name <> ${"nobody"} ORDER BY id`;
            const result = await client.query<{ id: number }>(
                query.text,
                query.values,
            );
            return result.rows.map((row) => row.id);
        },
    });
});

// ----------------------------------------------------------------
// Generated SQL
// ----------------------------------------------------------------

describe("postgres SQL output", () => {
    const render = (where: SqlFragment) => {
        const { text, values } = sql`${where}`;
        return { text, values };
    };

    const userFilter = sqlFilter<User>({
        columns: { isActive: "is_active" },
    }).def({
        name: { kind: "eq" },
        isActive: { kind: "eq" },
        ageIn: { kind: "inArray", field: "age" },
        emailContains: {
            kind: "contains",
            field: "email",
            caseInsensitive: true,
        },
    });

    it("numbers parameters across the whole query", () => {
        const where = userFilter({ name: "Bob", isActive: 1 });
        const query = sql`SELECT * FROM users WHERE org_id = ${7} AND ${where} LIMIT ${10}`;

        expect(query.text).toBe(
            'SELECT * FROM users WHERE org_id = $1 AND ("name" = $2 AND "is_active" = $3) LIMIT $4',
        );
        expect(query.values).toEqual([7, "Bob", 1, 10]);
    });

    it("renders a filter on its own", () => {
        expect(render(userFilter({ name: "Bob" }))).toEqual({
            text: '"name" = $1',
            values: ["Bob"],
        });
    });

    it("renders TRUE when no filters apply", () => {
        expect(sql`${userFilter({})}`.text).toBe("TRUE");
    });

    it("uses one array parameter for inArray", () => {
        expect(render(userFilter({ ageIn: [1, 2, 3] }))).toEqual({
            text: '"age" = ANY($1)',
            values: [[1, 2, 3]],
        });
    });

    it("uses ILIKE with an escape clause for caseInsensitive contains", () => {
        expect(render(userFilter({ emailContains: "50%_off" }))).toEqual({
            text: `"email" ILIKE $1 ESCAPE '\\'`,
            values: ["%50\\%\\_off%"],
        });
    });

    it("escapes double quotes in identifiers", () => {
        const filter = sqlFilter<User>({ columns: { name: 'we"ird' } }).def({
            name: { kind: "eq" },
        });
        expect(sql`${filter({ name: "x" })}`.text).toBe('"we""ird" = $1');
    });

    it("treats dots in renamed columns as qualifiers", () => {
        const filter = sqlFilter<User>({ columns: { name: "u.name" } }).def({
            name: { kind: "eq" },
        });
        expect(sql`${filter({ name: "x" })}`.text).toBe('"u"."name" = $1');
    });

    it("rejects nested field paths", () => {
        interface Employee {
            address: { city: string };
        }

        expect(() =>
            sqlFilter<Employee>().def({
                city: { kind: "eq", field: "address.city" },
            }),
        ).toThrow(/Nested field path "address.city"/);
    });

    it("only exposes driver keys", () => {
        expect(Object.keys(sql`SELECT ${1}`)).toEqual(["text", "values"]);
    });
});
