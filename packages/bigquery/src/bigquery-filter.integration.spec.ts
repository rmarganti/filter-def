/**
 * Runs generated SQL against a real BigQuery engine (the goccy/bigquery-emulator,
 * which uses Google's ZetaSQL). Skipped unless BIGQUERY_EMULATOR_HOST is set.
 *
 * ```sh
 * docker run --rm -p 9050:9050 ghcr.io/goccy/bigquery-emulator:latest --project=test
 * BIGQUERY_EMULATOR_HOST=http://localhost:9050 pnpm --filter @filter-def/bigquery test
 * ```
 */
import { BigQuery } from "@google-cloud/bigquery";
import { OAuth2Client } from "google-auth-library";
import { beforeAll, describe, expect, it } from "vitest";
import type { BigQueryFilterResult } from "./bigquery-filter.ts";
import { bigqueryFilter } from "./bigquery-filter.ts";

const EMULATOR_HOST = process.env.BIGQUERY_EMULATOR_HOST;
const PROJECT = "test";
const DATASET = "filter_def";
const TABLE = `\`${PROJECT}.${DATASET}.rows\``;

interface Row {
    id: number;
    name: string;
    tier: string;
    order: string;
    group: string;
    a: { b: string };
    a_b: string;
    label: string;
}

describe.skipIf(!EMULATOR_HOST)("BigQuery engine (emulator)", () => {
    let bigquery: BigQuery;

    const ids = async (where: BigQueryFilterResult): Promise<number[]> => {
        const [rows] = await bigquery.query({
            query: `SELECT id FROM ${TABLE} WHERE ${where.sql} ORDER BY id`,
            params: where.params,
        });
        return rows.map((row: { id: number }) => Number(row.id));
    };

    beforeAll(async () => {
        const authClient = new OAuth2Client();
        authClient.setCredentials({ access_token: "emulator" });

        bigquery = new BigQuery({
            projectId: PROJECT,
            apiEndpoint: EMULATOR_HOST,
            authClient,
        });

        await bigquery.dataset(DATASET).get({ autoCreate: true });
        await bigquery.query(`DROP TABLE IF EXISTS ${TABLE}`);
        await bigquery.query(
            `CREATE TABLE ${TABLE} (
                id INT64, name STRING, tier STRING, \`order\` STRING,
                \`group\` STRING, a STRUCT<b STRING>, a_b STRING, label STRING
            )`,
        );
        await bigquery.query(
            `INSERT INTO ${TABLE} (id, name, tier, \`order\`, \`group\`, a, a_b, label) VALUES
                (1, 'Alice', 'gold',     '1', 'x', STRUCT('p'), 'q', '50% off'),
                (2, 'Bob',   'gold',     '2', 'y', STRUCT('q'), 'q', '500 apples'),
                (3, 'Bob',   'silver',   '3', 'x', STRUCT('p'), 'z', 'snake_case'),
                (4, 'Carol', 'platinum', '4', 'y', STRUCT('z'), 'z', 'snakeXcase'),
                (5, 'Dave',  'silver',   '5', 'x', STRUCT('z'), 'z', 'C:\\\\dir')`,
        );
    }, 60_000);

    it("custom filter OR stays inside its own group (issue example)", async () => {
        const filter = bigqueryFilter<Row>().def({
            name: { kind: "eq" },
            vip: (): BigQueryFilterResult => ({
                sql: "tier = 'gold' OR tier = 'platinum'",
                params: {},
            }),
        });

        // Only gold/platinum Bobs -> Bob #2. Unwrapped, this returned 2, 4
        // (`name = 'Bob' AND tier = 'gold' OR tier = 'platinum'`).
        expect(await ids(filter({ vip: true, name: "Bob" }))).toEqual([2]);
    });

    it("reserved-word columns are queryable", async () => {
        const filter = bigqueryFilter<Row>().def({
            order: { kind: "gte" },
            group: { kind: "eq" },
            orderIn: { kind: "inArray", field: "order" },
        });

        expect(await ids(filter({ order: "2", group: "x" }))).toEqual([3, 5]);
        expect(await ids(filter({ orderIn: ["1", "4"] }))).toEqual([1, 4]);
    });

    it("quoted nested STRUCT paths still resolve", async () => {
        const filter = bigqueryFilter<Row>().def({
            ab: { kind: "eq", field: "a.b" },
        });

        expect(await ids(filter({ ab: "p" }))).toEqual([1, 3]);
    });

    it("`a.b` and `a_b` keep their own values", async () => {
        const filter = bigqueryFilter<Row>().def({
            "a.b": { kind: "eq" },
            a_b: { kind: "eq" },
        });

        // Sharing one @a_b param made this a.b = 'q' AND a_b = 'q' -> [2].
        expect(await ids(filter({ "a.b": "p", a_b: "q" }))).toEqual([1]);
    });

    it("boolean sub-params don't clash with a filter named like them", async () => {
        const filter = bigqueryFilter<Row>().def({
            order: {
                kind: "and",
                conditions: [
                    { kind: "gte", field: "order" },
                    { kind: "lte", field: "order" },
                ],
            },
            order_0: { kind: "neq", field: "name" },
        });

        expect(await ids(filter({ order: "3", order_0: "Alice" }))).toEqual([
            3,
        ]);
    });

    it("case-variant keys get distinct params", async () => {
        const filter = bigqueryFilter<Row>().def({
            name: { kind: "eq" },
            NAME: { kind: "neq", field: "tier" },
        });

        expect(await ids(filter({ name: "Bob", NAME: "gold" }))).toEqual([3]);
    });

    // The emulator's LIKE ignores backslash escapes (and doesn't treat `_` as
    // a wildcard), so an escaped pattern matches nothing there. Real BigQuery
    // honors them: "You can escape \, _, or % using two backslashes. For
    // example, \\%."
    // (docs.cloud.google.com/bigquery/docs/reference/standard-sql/operators)
    // This checks the half the emulator can show: a `%` in the search text no
    // longer acts as a wildcard.
    it("contains treats `%` in the search text literally", async () => {
        const filter = bigqueryFilter<Row>().def({
            label: { kind: "contains" },
            labelI: { kind: "contains", field: "label", caseInsensitive: true },
        });

        // Unescaped, "50%" also matched row 2, "500 apples".
        expect(await ids(filter({ label: "50%" }))).not.toContain(2);
        expect(await ids(filter({ labelI: "50%" }))).not.toContain(2);
    });
});
