import type { Dialect, SqlTag } from "./fragment.ts";
import { createSqlTag, fragment, getFragmentParts, join } from "./fragment.ts";
import type { SqlFilterFactory } from "./sql-filter.ts";
import { createSqlFilter } from "./sql-filter.ts";

/**
 * A query ready for `mysql2`'s `query()` or `execute()`.
 */
export interface MySqlQuery {
    sql: string;
    values: unknown[];
}

const mysqlDialect: Dialect<MySqlQuery> = {
    quoteIdentifier: (name) => `\`${name.replace(/`/g, "``")}\``,

    allowsNestedPaths: false,

    // `mysql2`'s `execute()` doesn't expand arrays, so emit one `?` per value.
    inArray: (column, values) =>
        fragment`${column} IN (${join(
            values.map((value) => fragment`${value}`),
            ", ",
        )})`,

    // MySQL's default LIKE escape character is already `\`.
    like: (column, pattern, caseInsensitive) =>
        caseInsensitive
            ? fragment`LOWER(${column}) LIKE LOWER(${pattern})`
            : fragment`${column} LIKE ${pattern}`,

    render: (query) => {
        const { strings, args } = getFragmentParts(query);
        return { sql: strings.join("?"), values: [...args] };
    },
};

/**
 * Builds a MySQL query. Interpolated filters and fragments are inlined;
 * everything else becomes a `?` parameter.
 *
 * ```typescript
 * const where = userFilter({ name: "Bob" });
 * const [rows] = await connection.execute(sql`SELECT * FROM users WHERE ${where}`);
 * ```
 */
export const sql: SqlTag<MySqlQuery> = createSqlTag(mysqlDialect);

/**
 * Define filters for an entity.
 *
 * ```typescript
 * const userFilter = mysqlFilter<User>({
 *     columns: { isActive: "is_active" },
 * }).def({
 *     name: { kind: "eq" },
 *     isActive: { kind: "eq" },
 * });
 * ```
 */
export const mysqlFilter: SqlFilterFactory = createSqlFilter(mysqlDialect);

export type * from "./types.ts";
