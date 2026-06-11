// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { ref } from "../../src/index.js";
import { setDeep, createScopedStore } from "../../src/dom/scoped-store.js";
import { evalInScope } from "../../src/dom/expression.js";

describe("setDeep", () => {
    test("writes single-level keys (plain and ref)", () => {
        const store = { plain: 1, boxed: ref(1) };

        setDeep(store, "plain", 2);
        setDeep(store, "boxed", 3);

        expect(store.plain).toBe(2);
        expect(store.boxed.value).toBe(3);
    });

    test("writes nested paths, creating intermediate objects", () => {
        const store = { form: ref<Record<string, any>>({}) };

        setDeep(store, "form.address.city", "Rome");

        expect(store.form.value.address.city).toBe("Rome");
    });

    test("blocks prototype-related path segments (security)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const store = { user: ref<Record<string, any>>({}) };

        setDeep(store, "user.__proto__.polluted", true);
        setDeep(store, "user.constructor.prototype.polluted", true);

        expect(({} as any).polluted).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(2);

        warn.mockRestore();
    });
});

describe("createScopedStore", () => {
    test("own vars shadow the parent; parent stays reachable; expressions unwrap refs", () => {
        const parent = { shared: ref("parent"), label: "p" };
        const scoped = createScopedStore(parent, { label: "row" });

        expect(scoped.label).toBe("row");           // own var wins
        expect(scoped.shared).toBe(parent.shared);  // parent ref passes through raw…
        expect("shared" in scoped).toBe(true);
        expect("missing" in scoped).toBe(false);

        // …and evaluation unwraps it, like every other store value
        expect(evalInScope("shared + '/' + label", scoped)).toBe("parent/row");
    });
});
