import { describe, test, expect, vi } from "vitest";
import { ref, isRef, unref, triggerRef, effect, nextTick } from "../../src/index.js";

describe("ref", () => {
    test("creates reactive reference", () => {
        const count = ref(0);
        expect(count.value).toBe(0);
    });

    test("updates value", () => {
        const count = ref(0);
        count.value = 5;
        expect(count.value).toBe(5);
    });

    test("triggers effect on change", async () => {
        const count = ref(0);
        let dummy;

        effect(() => {
            dummy = count.value;
        });

        expect(dummy).toBe(0);

        count.value = 1;
        await nextTick();

        expect(dummy).toBe(1);
    });

    test("skips trigger when value is identical", async () => {
        const count = ref(1);
        let runs = 0;

        effect(() => {
            count.value;
            runs++;
        });

        count.value = 1;
        await nextTick();

        expect(runs).toBe(1); // only the initial run
    });

    test("works with arrays", () => {
        const arr = ref([1, 2, 3]);
        expect(Array.from(arr.value)).toEqual([1, 2, 3]);
    });

    test("array mutations trigger effects", async () => {
        const arr = ref([1, 2, 3]);
        let dummy;

        effect(() => {
            dummy = arr.value.length;
        });

        expect(dummy).toBe(3);

        arr.value.push(4);
        await nextTick();

        expect(dummy).toBe(4);
    });

    test("array index assignment works and triggers", async () => {
        const arr = ref([1, 2, 3]);
        let dummy;

        effect(() => {
            dummy = arr.value[0];
        });

        arr.value[0] = 99;
        await nextTick();

        expect(arr.value[0]).toBe(99);
        expect(dummy).toBe(99);
    });

    test("ref of a ref returns the same ref", () => {
        const inner = ref(1);
        const outer = ref(inner);
        expect(outer).toBe(inner);
    });

    test("assignment to a non-value property warns instead of throwing", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const count = ref(0);

        expect(() => {
            (count as any).other = 123;
        }).not.toThrow();

        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
});

describe("isRef / unref / triggerRef", () => {
    test("isRef detects refs and rejects look-alikes", () => {
        expect(isRef(ref(0))).toBe(true);
        expect(isRef(0)).toBe(false);
        expect(isRef(null)).toBe(false);
        // the duck-typing false positive from the old implementation
        expect(isRef({ value: "inner", label: "outer" })).toBe(false);
    });

    test("unref unwraps refs and passes other values through", () => {
        expect(unref(ref(7))).toBe(7);
        expect(unref(7)).toBe(7);

        const plain = { value: "inner" };
        expect(unref(plain as any)).toBe(plain);
    });

    test("triggerRef re-runs subscribers after an in-place mutation", async () => {
        const user = ref({ name: "a" });
        let seen;

        effect(() => {
            seen = user.value.name;
        });

        expect(seen).toBe("a");

        // in-place mutation — identity unchanged, no automatic trigger
        user.value.name = "b";
        triggerRef(user);
        await nextTick();

        expect(seen).toBe("b");
    });

    test("triggerRef is a safe no-op on non-refs", () => {
        expect(() => triggerRef({ value: 1 } as any)).not.toThrow();
        expect(() => triggerRef(null as any)).not.toThrow();
    });
});
