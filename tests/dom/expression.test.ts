// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { ref } from "../../src/index.js";
import { evalInScope } from "../../src/dom/expression.js";

describe("evalInScope", () => {
    test("evaluates expressions against store keys", () => {
        expect(evalInScope("a + b", { a: 1, b: 2 })).toBe(3);
    });

    test("unwraps refs", () => {
        expect(evalInScope("count * 2", { count: ref(21) })).toBe(42);
    });

    test("does NOT unwrap plain objects with a value property (regression)", () => {
        const config = { value: "inner", label: "outer" };

        // the old duck-typed unwrap returned "inner" here
        expect(evalInScope("config", { config })).toBe(config);
        expect(evalInScope("config.label", { config })).toBe("outer");
    });

    test("identifiers inside string literals are not captured", () => {
        expect(evalInScope("'missing' + suffix", { suffix: "!", missing: "BAD" })).toBe("missing!");
    });

    test("property-access tails are not treated as root identifiers", () => {
        const store = { user: { name: "x" }, name: "SHOULD-NOT-LEAK" };
        expect(evalInScope("user.name", store)).toBe("x");
    });

    test("javascript keywords and literals pass through", () => {
        expect(evalInScope("flag ? 1 : 0", { flag: true })).toBe(1);
        expect(evalInScope("typeof missing === 'undefined'", {})).toBe(true);
        expect(evalInScope("null", {})).toBeNull();
    });

    test("empty expressions return undefined", () => {
        expect(evalInScope("", {})).toBeUndefined();
        expect(evalInScope("   ", {})).toBeUndefined();
        expect(evalInScope(null, {})).toBeUndefined();
    });

    test("errors are reported and return undefined", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(evalInScope("(((", {})).toBeUndefined();
        expect(error).toHaveBeenCalled();

        error.mockRestore();
    });

    test("store lookups work through prototype chains (scoped stores)", () => {
        const parent = { shared: 10 };
        const child = Object.create(parent);
        child.own = 5;

        expect(evalInScope("shared + own", child)).toBe(15);
    });
});
