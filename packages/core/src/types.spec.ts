import { describe, expectTypeOf, it } from "vitest";
import type { CoreFilterInput, FieldPath, PathValue } from "./types.ts";

interface User {
    id: string | null;
    name: string;
    age: number;
}

describe("CoreFilterInput", () => {
    it("should omit null and undefined from input types", () => {
        type EqInput = CoreFilterInput<"id", User, { kind: "eq"; field: "id" }>;
        expectTypeOf<EqInput>().toEqualTypeOf<string>();
    });
});

describe("FieldPath", () => {
    interface Nested {
        name: { first: string; last: string };
        address: { city: string; geo: { lat: number; lng: number } };
        age: number;
    }

    it("should produce top-level keys", () => {
        type Paths = FieldPath<Nested>;
        expectTypeOf<"age">().toMatchTypeOf<Paths>();
        expectTypeOf<"name">().toMatchTypeOf<Paths>();
    });

    it("should produce dot-separated nested paths", () => {
        type Paths = FieldPath<Nested>;
        expectTypeOf<"name.first">().toMatchTypeOf<Paths>();
        expectTypeOf<"address.geo.lat">().toMatchTypeOf<Paths>();
    });

    it("should not produce invalid paths", () => {
        type Paths = FieldPath<Nested>;
        expectTypeOf<"invalid">().not.toMatchTypeOf<Paths>();
        expectTypeOf<"name.middle">().not.toMatchTypeOf<Paths>();
    });
});

describe("PathValue", () => {
    interface Nested {
        name: { first: string; last: string };
        age: number;
    }

    it("should resolve top-level field types", () => {
        expectTypeOf<PathValue<Nested, "age">>().toEqualTypeOf<number>();
    });

    it("should resolve nested field types", () => {
        expectTypeOf<PathValue<Nested, "name.first">>().toEqualTypeOf<string>();
    });
});

describe("CoreFilterInput with nested fields", () => {
    interface Nested {
        name: { first: string; last: string };
    }

    it("should resolve input type for nested field path", () => {
        type EqInput = CoreFilterInput<
            "firstName",
            Nested,
            { kind: "eq"; field: "name.first" }
        >;
        expectTypeOf<EqInput>().toEqualTypeOf<string>();
    });
});
