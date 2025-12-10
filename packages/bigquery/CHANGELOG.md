# @filter-def/bigquery

## 0.1.0

### Minor Changes

- 64c1efc: Add new BigQuery adapter package for filter-def.

    This package generates parameterized SQL queries compatible with `@google-cloud/bigquery`.

    ## Features
    - All primitive filters: `eq`, `neq`, `contains`, `inArray`, `gt`, `gte`, `lt`, `lte`, `isNull`, `isNotNull`
    - Boolean filters: `and`, `or` for combining conditions
    - Custom filters for complex SQL expressions
    - Type-safe filter inputs inferred from your entity type
    - Parameterized queries with `@paramName` placeholders
    - Always returns valid SQL - empty filters return `{ sql: "true", params: {} }` for seamless query composition

    ## Basic Usage

    ```typescript
    import { bigqueryFilter } from "@filter-def/bigquery";
    import { BigQuery } from "@google-cloud/bigquery";

    // This is used to define the shape of the data you expect to be returned from BigQuery.
    // It also helps define the input types or your filters.
    interface User {
        id: number;
        name: string;
        email: string;
        age: number;
    }

    const userFilter = bigqueryFilter<User>().def({
        name: { kind: "eq" },
        emailContains: { kind: "contains", field: "email" },
        minAge: { kind: "gte", field: "age" },
    });

    const where = userFilter({ name: "John", minAge: 18 });
    // where = {
    //   sql: "name = @name AND age >= @minAge",
    //   params: { name: "John", minAge: 18 }
    // }

    // Use with @google-cloud/bigquery
    // Filter always returns valid SQL (empty filters return 'WHERE true')
    const bigquery = new BigQuery();
    const [rows] = await bigquery.query({
        query: `SELECT * FROM \`myproject.dataset.users\` WHERE ${where.sql}`,
        params: where.params,
    });
    ```
