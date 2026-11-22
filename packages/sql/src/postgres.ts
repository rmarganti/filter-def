import type { Dialect, SqlTag } from "./fragment.ts";
import { createSqlTag, fragment, getFragmentParts } from "./fragment.ts";
import type { SqlFilterFactory } from "./sql-filter.ts";
import { createSqlFilter } from "./sql-filter.ts";

/**
 * A query ready for `pg`'s `client.query()` (or any driver that takes
 * `$1`-style placeholders).
 */
export interface PostgresQuery {
    text: string;
    values: unknown[];
}

const postgresDialect: Dialect<PostgresQuery> = {
    quoteIdentifier: (name) => `"${name.replace(/"/g, '""')}"`,

    allowsNestedPaths: false,

    // One array parameter, regardless of list length.
    inArray: (column, values) => fragment`${column} = ANY(${values})`,

    // Cast so non-text columns (e.g. integers) can be matched.
    like: (column, pattern, caseInsensitive) =>
        caseInsensitive
            ? fragment`CAST(${column} AS TEXT) ILIKE ${pattern} ESCAPE '\\'`
            : fragment`CAST(${column} AS TEXT) LIKE ${pattern} ESCAPE '\\'`,

    render: (query) => {
        const { strings, args } = getFragmentParts(query);
        let text = strings[0];
        for (let i = 1; i < strings.length; i++) {
            text += `$${i}${strings[i]}`;
        }
        return { text, values: [...args] };
    },
};

/**
 * Builds a Postgres query. Interpolated filters and fragments are inlined;
 * everything else becomes a `$n` parameter.
 *
 * ```typescript
 * const where = userFilter({ name: "Bob" });
 * await pool.query(sql`SELECT * FROM users WHERE ${where}`);
 * ```
 */
export const sql: SqlTag<PostgresQuery> = createSqlTag(postgresDialect);

/**
 * Define filters for an entity.
 *
 * ```typescript
 * const userFilter = postgresFilter<User>({
 *     columns: { isActive: "is_active" },
 * }).def({
 *     name: { kind: "eq" },
 *     isActive: { kind: "eq" },
 * });
 * ```
 */
export const postgresFilter: SqlFilterFactory =
    createSqlFilter(postgresDialect);

export type * from "./types.ts";
