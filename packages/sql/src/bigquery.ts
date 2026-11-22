import type { Dialect, SqlTag } from "./fragment.ts";
import { createSqlTag, fragment, getFragmentParts } from "./fragment.ts";
import type { SqlFilterFactory } from "./sql-filter.ts";
import { createSqlFilter } from "./sql-filter.ts";

/**
 * A query ready for `@google-cloud/bigquery`'s `query()`.
 */
export interface BigQueryQuery {
    query: string;
    params: Record<string, unknown>;
}

const bigqueryDialect: Dialect<BigQueryQuery> = {
    quoteIdentifier: (name) => `\`${name.replace(/[`\\]/g, "\\$&")}\``,

    // Dotted paths map to STRUCT fields.
    allowsNestedPaths: true,

    inArray: (column, values) => fragment`${column} IN UNNEST(${values})`,

    // BigQuery's LIKE treats `\` as the escape character. Cast so non-STRING
    // columns (e.g. INT64) can be matched.
    like: (column, pattern, caseInsensitive) =>
        caseInsensitive
            ? fragment`LOWER(CAST(${column} AS STRING)) LIKE LOWER(${pattern})`
            : fragment`CAST(${column} AS STRING) LIKE ${pattern}`,

    render: (query) => {
        const { strings, args } = getFragmentParts(query);
        let text = strings[0];
        const params: Record<string, unknown> = {};
        for (let i = 0; i < args.length; i++) {
            params[`p${i}`] = args[i];
            text += `@p${i}${strings[i + 1]}`;
        }
        return { query: text, params };
    },
};

/**
 * Builds a BigQuery query. Interpolated filters and fragments are inlined;
 * everything else becomes a named `@pN` parameter.
 *
 * ```typescript
 * const where = userFilter({ name: "Bob" });
 * const [rows] = await bigquery.query(
 *     sql`SELECT * FROM \`project.dataset.users\` WHERE ${where}`,
 * );
 * ```
 */
export const sql: SqlTag<BigQueryQuery> = createSqlTag(bigqueryDialect);

/**
 * Define filters for an entity. Dotted field paths map to STRUCT fields.
 *
 * ```typescript
 * const userFilter = sqlFilter<User>().def({
 *     name: { kind: "eq" },
 *     city: { kind: "eq", field: "address.city" },
 * });
 * ```
 */
export const sqlFilter: SqlFilterFactory = createSqlFilter(bigqueryDialect);

export type * from "./types.ts";
