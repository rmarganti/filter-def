import { bench, describe } from "vitest";
import { entity } from "./filter-def";
import { generateUsers } from "../perf/data";

const users = generateUsers(10000);

describe("Filter Performance Benchmarks", () => {
    const userFilter = entity<(typeof users)[0]>().filterDef({
        firstName: { kind: "eq" },
        firstNameContains: { kind: "contains", field: "firstName" },
        age: { kind: "eq" },
        olderThan: { kind: "gt", field: "age" },
        youngerThan: { kind: "lt", field: "age" },
        ageRange: { kind: "gte", field: "age" },
        verified: { kind: "eq" },
        emailContains: { kind: "contains", field: "email" },
        searchTerm: {
            kind: "or",
            conditions: [
                { kind: "contains", field: "firstName" },
                { kind: "contains", field: "lastName" },
                { kind: "contains", field: "email" },
            ],
        },
    });

    bench("eq filter - string field", () => {
        const predicate = userFilter({ firstName: "John" });
        users.filter(predicate);
    });

    bench("contains filter - string field", () => {
        const predicate = userFilter({ firstNameContains: "John" });
        users.filter(predicate);
    });

    bench("gt filter - numeric field", () => {
        const predicate = userFilter({ olderThan: 30 });
        users.filter(predicate);
    });

    bench("lt filter - numeric field", () => {
        const predicate = userFilter({ youngerThan: 50 });
        users.filter(predicate);
    });

    bench("gte filter - numeric field", () => {
        const predicate = userFilter({ ageRange: 25 });
        users.filter(predicate);
    });

    bench("or filter - multiple contains", () => {
        const predicate = userFilter({ searchTerm: "test" });
        users.filter(predicate);
    });

    bench("combined filters", () => {
        const predicate = userFilter({
            verified: true,
            olderThan: 25,
            firstNameContains: "a",
        });
        users.filter(predicate);
    });

    bench("multiple filters with early exit", () => {
        const predicate = userFilter({
            firstName: "NonExistent",
            verified: true,
            olderThan: 25,
        });
        users.filter(predicate);
    });
});
