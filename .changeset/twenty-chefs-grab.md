---
"@filter-def/in-memory": minor
"@filter-def/bigquery": minor
"@filter-def/drizzle": minor
"@filter-def/core": minor
---

## Changes

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

const where = userFilter({ firstName: 'Bob', lat: 25 });
// {
//     sql: 'name.first = @firstName AND address.geo.lat = @lat',
//     params: { firstName: 'Bob', lat: 21 },
// }
```
