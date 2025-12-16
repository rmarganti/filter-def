import { describe, expectTypeOf, it } from "vitest";
import type { CoreFilterInput } from "./types.ts";

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
