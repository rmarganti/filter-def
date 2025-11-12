import { describe, expect, it } from "vitest";
import { entity } from "./philter";

interface User {
    name: string;
    email: string;
    age: number;
}

const userEntity = entity<User>();
const userFilter = userEntity.philter({
    name: { kind: "equals", field: "name" },
    emailContains: { kind: "contains", field: "email" },
    age: { kind: "equals", field: "age" },
    ageInArray: { kind: "inArray", field: "age" },
});

const exampleUsers: Array<User> = [
    { name: "John Doe", email: "john@example.com", age: 30 },
    { name: "Jane Doe", email: "jane@example.com", age: 25 },
    { name: "Bob Smith", email: "bob@example.com", age: 40 },
];

describe("Philter", () => {
    it("should work", () => {
        const result = userFilter(exampleUsers, {
            name: "John Doe",
            emailContains: "example.com",
            ageInArray: [25, 30],
        });

        // Only the first user matches all 3 criteria
        expect(result).toEqual([exampleUsers[0]]);
    });
});
