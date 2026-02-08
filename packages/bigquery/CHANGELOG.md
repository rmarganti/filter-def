# @filter-def/bigquery

## 1.1.0

### Minor Changes

- 0baebc1: ## Changes

  - Adds support for filtering on nested fields in `@filter-def/in-memory` and `@filter-def/bigquery` packages
  - errors for `@filter-def/drizzle`, due to driver-specific implementations. For now, we are driver agnostic.

  ## Example (BigQuery):

  ```typescript
  interface UserWithAddress {
    name: { first: string; last: string };
    address: { city: string; geo: { lat: number; lng: number } };
  }

  interface UserWithAddress {
    name: { first: string; last: string };
    address: { city: string; geo: { lat: number; lng: number } };
  }

  const userFilter = bigqueryFilter<UserWithAddress>().def({
    firstName: { kind: "eq", field: "name.first" },
    lat: { kind: "eq", field: "address.geo.lat" },
  });

  const where = userFilter({ firstName: "Bob", lat: 25 });
  // {
  //     sql: 'name.first = @firstName AND address.geo.lat = @lat',
  //     params: { firstName: 'Bob', lat: 21 },
  // }
  ```

### Patch Changes

- Updated dependencies [0baebc1]
  - @filter-def/core@1.1.0

## 1.0.0

### Major Changes

- 7f24812: Enforce non-null filter inputs for all filter types.

  **Breaking change**: Filter inputs can no longer accept `null` or `undefined` values. The `CoreFilterInput` type now excludes these values, requiring explicit filter values. When a value can be nullable, prefer the `isNull` filter kind instead.

  Refactored `CoreFilterInputMap` type to use a new `FieldTypeForFilter` helper, reducing type repetition and improving maintainability.

  Added type tests for `CoreFilterInput` behavior via vitest.

### Patch Changes

- Updated dependencies [7f24812]
  - @filter-def/core@1.0.0

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
