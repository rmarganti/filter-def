import { bench, describe } from "vitest";
import { entity } from "../lib/filter-def";
import { generateUsers, type User } from "./data";

export const userFilter = entity<User>().filterDef({
    firstName: { kind: "equals", field: "firstName" },
    firstOrLastName: {
        kind: "or",
        conditions: [
            { kind: "equals", field: "firstName" },
            { kind: "equals", field: "lastName" },
        ],
    },
    emailContains: { kind: "contains", field: "email" },
    isVerified: { kind: "equals", field: "verified" },
    olderThan: { kind: "gte", field: "age" },
});

// ----------------------------------------------------------------
// Benchmark Tests
// ----------------------------------------------------------------

describe("filter-def performance", () => {
    const smallDataset = generateUsers(100);
    const mediumDataset = generateUsers(1000);
    const largeDataset = generateUsers(10000);

    describe("single filter - equals", () => {
        bench("100 items", () => {
            userFilter(smallDataset, { firstName: "John" });
        });

        bench("1,000 items", () => {
            userFilter(mediumDataset, { firstName: "John" });
        });

        bench("10,000 items", () => {
            userFilter(largeDataset, { firstName: "John" });
        });
    });

    describe("single filter - contains", () => {
        bench("100 items", () => {
            userFilter(smallDataset, { emailContains: "@example.com" });
        });

        bench("1,000 items", () => {
            userFilter(mediumDataset, { emailContains: "@example.com" });
        });

        bench("10,000 items", () => {
            userFilter(largeDataset, { emailContains: "@example.com" });
        });
    });

    describe("single filter - comparison", () => {
        bench("100 items", () => {
            userFilter(smallDataset, { olderThan: 30 });
        });

        bench("1,000 items", () => {
            userFilter(mediumDataset, { olderThan: 30 });
        });

        bench("10,000 items", () => {
            userFilter(largeDataset, { olderThan: 30 });
        });
    });

    describe("multiple filters", () => {
        bench("100 items - 2 filters", () => {
            userFilter(smallDataset, {
                firstName: "John",
                isVerified: true,
            });
        });

        bench("1,000 items - 2 filters", () => {
            userFilter(mediumDataset, {
                firstName: "John",
                isVerified: true,
            });
        });

        bench("10,000 items - 2 filters", () => {
            userFilter(largeDataset, {
                firstName: "John",
                isVerified: true,
            });
        });

        bench("100 items - all filters", () => {
            userFilter(smallDataset, {
                firstName: "John",
                emailContains: "@example.com",
                isVerified: true,
                olderThan: 30,
            });
        });

        bench("1,000 items - all filters", () => {
            userFilter(mediumDataset, {
                firstName: "John",
                emailContains: "@example.com",
                isVerified: true,
                olderThan: 30,
            });
        });

        bench("10,000 items - all filters", () => {
            userFilter(largeDataset, {
                firstName: "John",
                emailContains: "@example.com",
                isVerified: true,
                olderThan: 30,
            });
        });
    });

    describe("boolean filters - or", () => {
        bench("100 items", () => {
            userFilter(smallDataset, { firstOrLastName: "John" });
        });

        bench("1,000 items", () => {
            userFilter(mediumDataset, { firstOrLastName: "John" });
        });

        bench("10,000 items", () => {
            userFilter(largeDataset, { firstOrLastName: "John" });
        });
    });

    describe("no filters applied", () => {
        bench("100 items", () => {
            userFilter(smallDataset, {});
        });

        bench("1,000 items", () => {
            userFilter(mediumDataset, {});
        });

        bench("10,000 items", () => {
            userFilter(largeDataset, {});
        });
    });
});
