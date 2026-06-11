import { describe, test, expect, vi } from "vitest";
import { ref, reactive, computed, isRef, effect, nextTick } from "../../src/index.js";

describe("computed", () => {
    test("computes value from getter", () => {
        const count = ref(1);
        const doubled = computed(() => count.value * 2);
        expect(doubled.value).toBe(2);
    });

    test("updates synchronously", () => {
        const count = ref(1);
        const doubled = computed(() => count.value * 2);

        count.value = 5;
        expect(doubled.value).toBe(10);
    });

    test("chains correctly", () => {
        const count = ref(2);
        const doubled = computed(() => count.value * 2);
        const quadrupled = computed(() => doubled.value * 2);

        expect(quadrupled.value).toBe(8);

        count.value = 3;
        expect(quadrupled.value).toBe(12);
    });

    test("works with reactive objects", () => {
        const state = reactive({ a: 1, b: 2 });
        const sum = computed(() => state.a + state.b);

        expect(sum.value).toBe(3);

        state.a = 10;
        expect(sum.value).toBe(12);
    });

    test("complex expressions", () => {
        const users = ref([
            { name: "Alice", age: 25 },
            { name: "Bob", age: 30 }
        ]);
        const firstUserName = computed(() => users.value[0].name);

        expect(firstUserName.value).toBe("Alice");

        users.value = [{ name: "Charlie", age: 35 }];
        expect(firstUserName.value).toBe("Charlie");
    });

    test("is fully lazy: getter doesn't run until first read, then only on demand", () => {
        const count = ref(0);
        let runs = 0;

        const doubled = computed(() => {
            runs++;

            return count.value * 2;
        });

        expect(runs).toBe(0); // never read — never computed

        expect(doubled.value).toBe(0);
        expect(runs).toBe(1); // first read computes

        count.value = 1;
        count.value = 2;
        expect(runs).toBe(1); // invalidated, not recomputed

        expect(doubled.value).toBe(4);
        expect(runs).toBe(2); // recomputed once on read
    });

    test("notifies dependent effects", async () => {
        const count = ref(1);
        const doubled = computed(() => count.value * 2);
        let dummy;

        effect(() => {
            dummy = doubled.value;
        });

        count.value = 4;
        await nextTick();

        expect(dummy).toBe(8);
    });

    test("is branded as a ref", () => {
        const doubled = computed(() => 2);
        expect(isRef(doubled)).toBe(true);
    });

    test("assignment warns instead of throwing (regression: strict-mode TypeError)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const count = ref(1);
        const doubled = computed(() => count.value * 2);

        expect(() => {
            (doubled as any).value = 99;
        }).not.toThrow();

        expect(doubled.value).toBe(2); // unchanged
        expect(warn).toHaveBeenCalledOnce();

        warn.mockRestore();
    });
});
