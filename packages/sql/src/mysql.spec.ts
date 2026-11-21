import process from "node:process";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { createConnection } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SqlFragment } from "./mysql.ts";
import { sql, sqlFilter } from "./mysql.ts";
import type { User } from "./testing/integration-suite.ts";
import {
    exampleUsers,
    runIntegrationSuite,
} from "./testing/integration-suite.ts";

// ----------------------------------------------------------------
// Integration
// ----------------------------------------------------------------

/**
 * Integration tests need a MySQL server, ie.
 * `MYSQL_URL=mysql://root:test@127.0.0.1:33061/filter_def`.
 */
const MYSQL_URL = process.env.MYSQL_URL;

describe.skipIf(!MYSQL_URL)("mysql integration", () => {
    let connection: Connection;

    beforeAll(async () => {
        connection = await createConnection(MYSQL_URL!);

        await connection.query("DROP TABLE IF EXISTS users");
        await connection.query(`
            CREATE TABLE users (
                id INT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                age INT NOT NULL,
                phone VARCHAR(255),
                is_active INT NOT NULL,
                score INT NOT NULL,
                \`order\` INT NOT NULL
            )
        `);

        for (const u of exampleUsers) {
            await connection.execute(
                sql`INSERT INTO users VALUES (${u.id}, ${u.name}, ${u.email}, ${u.age}, ${u.phone}, ${u.isActive}, ${u.score}, ${u.order})`,
            );
        }
    });

    afterAll(async () => {
        await connection?.end();
    });

    runIntegrationSuite({
        sqlFilter,
        // The default utf8mb4_0900_ai_ci collation makes LIKE case-insensitive.
        caseSensitiveLike: false,
        idOneOrTwo: sql`id = 1 OR id = 2`,
        selectIds: async (where) => {
            const [rows] = await connection.execute<RowDataPacket[]>(
                sql`SELECT id FROM users WHERE id > ${0} AND ${where} AND name <> ${"nobody"} ORDER BY id`,
            );
            return rows.map((row) => row.id as number);
        },
    });
});

// ----------------------------------------------------------------
// Generated SQL
// ----------------------------------------------------------------

describe("mysql SQL output", () => {
    const render = (where: SqlFragment) => {
        const { sql: text, values } = sql`${where}`;
        return { sql: text, values };
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

    it("uses ? placeholders across the whole query", () => {
        const where = userFilter({ name: "Bob", isActive: 1 });
        const query = sql`SELECT * FROM users WHERE org_id = ${7} AND ${where} LIMIT ${10}`;

        expect(query.sql).toBe(
            "SELECT * FROM users WHERE org_id = ? AND (`name` = ? AND `is_active` = ?) LIMIT ?",
        );
        expect(query.values).toEqual([7, "Bob", 1, 10]);
    });

    it("expands inArray into one placeholder per value", () => {
        expect(render(userFilter({ ageIn: [1, 2, 3] }))).toEqual({
            sql: "`age` IN (?, ?, ?)",
            values: [1, 2, 3],
        });
    });

    it("lowercases both sides for caseInsensitive contains", () => {
        expect(render(userFilter({ emailContains: "50%" }))).toEqual({
            sql: "LOWER(`email`) LIKE LOWER(?)",
            values: ["%50\\%%"],
        });
    });

    it("escapes backticks in identifiers", () => {
        const filter = sqlFilter<User>({ columns: { name: "we`ird" } }).def({
            name: { kind: "eq" },
        });
        expect(render(filter({ name: "x" })).sql).toBe("`we``ird` = ?");
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
        expect(Object.keys(sql`SELECT ${1}`)).toEqual(["sql", "values"]);
    });
});
