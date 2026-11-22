// ----------------------------------------------------------------
// Fragments
// ----------------------------------------------------------------

/**
 * Fragment internals live behind a symbol so rendered queries can be handed
 * straight to a driver without leaking extra enumerable keys.
 */
const FRAGMENT = Symbol("filter-def.sql-fragment");

interface FragmentParts {
    /** Literal SQL text. Always one longer than `args`. */
    readonly strings: readonly string[];
    /** Values that become bound parameters, one between each pair of strings. */
    readonly args: readonly unknown[];
}

/**
 * A piece of SQL with its bound values, not yet tied to a placeholder style.
 * Build one with a dialect's `sql` tag; interpolating a fragment into another
 * `sql` template inlines it, while any other value becomes a bound parameter.
 */
export interface SqlFragment {
    readonly [FRAGMENT]: FragmentParts;
}

const makeFragment = (
    strings: readonly string[],
    args: readonly unknown[],
): SqlFragment => ({ [FRAGMENT]: { strings, args } });

export const isFragment = (value: unknown): value is SqlFragment =>
    typeof value === "object" && value !== null && FRAGMENT in value;

export const getFragmentParts = (fragment: SqlFragment): FragmentParts =>
    fragment[FRAGMENT];

/**
 * Dialect-neutral template tag. Nested fragments are flattened so the result
 * always has plain `strings` and `args`.
 */
export const fragment = (
    strings: readonly string[],
    ...values: readonly unknown[]
): SqlFragment => {
    const outStrings: string[] = [strings[0]];
    const args: unknown[] = [];

    for (let i = 0; i < values.length; i++) {
        const value = values[i];

        if (isFragment(value)) {
            const inner = value[FRAGMENT];
            outStrings[outStrings.length - 1] += inner.strings[0];
            for (let j = 0; j < inner.args.length; j++) {
                args.push(inner.args[j]);
                outStrings.push(inner.strings[j + 1]);
            }
            outStrings[outStrings.length - 1] += strings[i + 1];
        } else {
            args.push(value);
            outStrings.push(strings[i + 1]);
        }
    }

    return makeFragment(outStrings, args);
};

/**
 * Raw SQL text with no parameters. Never pass user input here.
 */
export const raw = (text: string): SqlFragment => makeFragment([text], []);

/**
 * Joins fragments with a raw separator.
 */
export const join = (
    fragments: readonly SqlFragment[],
    separator: string,
): SqlFragment => {
    if (fragments.length === 0) return raw("");

    let result = fragments[0];
    for (let i = 1; i < fragments.length; i++) {
        result = fragment(["", separator, ""], result, fragments[i]);
    }
    return result;
};

/**
 * Wraps a fragment in parentheses.
 */
export const parens = (inner: SqlFragment): SqlFragment =>
    fragment(["(", ")"], inner);

// ----------------------------------------------------------------
// Dialects
// ----------------------------------------------------------------

/**
 * Everything that differs between databases.
 */
export interface Dialect<TQuery> {
    /** Quotes a single identifier segment (no dots). */
    quoteIdentifier: (name: string) => string;

    /** Whether dotted field paths (`address.city`) map to nested columns. */
    allowsNestedPaths: boolean;

    /** `column IN (...)` for a non-empty list. */
    inArray: (column: SqlFragment, values: readonly unknown[]) => SqlFragment;

    /** `column LIKE pattern`. The pattern is already escaped and wrapped in `%`. */
    like: (
        column: SqlFragment,
        pattern: string,
        caseInsensitive: boolean,
    ) => SqlFragment;

    /** Turns a fragment into the object the database driver expects. */
    render: (fragment: SqlFragment) => TQuery;
}

/**
 * The `sql` template tag for a dialect. The result is both a fragment (so it
 * can be nested) and the driver-ready query object.
 */
export type SqlTag<TQuery> = (
    strings: TemplateStringsArray,
    ...values: unknown[]
) => SqlFragment & TQuery;

export const createSqlTag =
    <TQuery>(dialect: Dialect<TQuery>): SqlTag<TQuery> =>
    (strings, ...values) => {
        const result = fragment(strings, ...values);
        return Object.assign(result, dialect.render(result));
    };
