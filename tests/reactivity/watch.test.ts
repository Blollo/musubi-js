import { describe, test, expect, vi } from "vitest";
import { ref, reactive, computed, watch, nextTick } from "../../src/index.js";

describe("watch", () => {
    test("basic ref watching", async () => {
        const count = ref(0);
        let newVal, oldVal;

        watch(count, (n, o) => {
            newVal = n;
            oldVal = o;
        });

        count.value = 5;
        await nextTick();

        expect(newVal).toBe(5);
        expect(oldVal).toBe(0);
    });

    test("computed watching", async () => {
        const count = ref(0);
        const doubled = computed(() => count.value * 2);
        let watchedValue;

        watch(doubled, (n) => {
            watchedValue = n;
        });

        count.value = 5;
        await nextTick();

        expect(watchedValue).toBe(10);
    });

    test("immediate option", async () => {
        const count = ref(5);
        let calls = 0;

        watch(count, () => {
            calls++;
        }, { immediate: true });

        await nextTick();

        expect(calls).toBe(1); // fires immediately
    });

    test("old value preservation (snapshots are independent)", async () => {
        const obj = ref({ count: 1 });
        let oldVal, newVal;

        watch(obj, (n, o) => {
            newVal = n;
            oldVal = o;
        });

        obj.value = { count: 2 };
        await nextTick();

        expect(oldVal).not.toBe(newVal);
        expect(oldVal!.count).toBe(1);
        expect(newVal!.count).toBe(2);
    });

    test("callback reads don't create circular dependencies", async () => {
        const count = ref(0);
        const other = ref(0);
        let watchCalls = 0;

        watch(count, () => {
            watchCalls++;
            other.value++; // must not loop back into the watcher
        });

        count.value = 1;
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(watchCalls).toBe(1);
        expect(other.value).toBe(1);
    });

    test("function getter", async () => {
        const state = reactive({ a: 1, b: 2 });
        let sum;

        watch(
            () => state.a + state.b,
            (n) => {
                sum = n;
            }
        );

        state.a = 10;
        await nextTick();

        expect(sum).toBe(12);
    });

    test("deep option tracks nested reactive properties", async () => {
        const state = reactive({ user: { name: "a" } });
        let snapshot;

        watch(state, (n) => {
            snapshot = n;
        }, { deep: true });

        state.user.name = "b";
        await nextTick();

        expect(snapshot!.user.name).toBe("b");
    });

    test("stop() detaches the watcher", async () => {
        const count = ref(0);
        let calls = 0;

        const watcher = watch(count, () => {
            calls++;
        });

        watcher.stop();
        count.value = 1;
        await nextTick();

        expect(calls).toBe(0);
    });

    test("a plain object with a value property is NOT treated as a ref (regression)", async () => {
        const lookAlike = { value: 1, label: "x" };
        let received;

        watch(lookAlike, (n) => {
            received = n;
        }, { immediate: true });

        await nextTick();

        // the old duck-typed check would have unwrapped .value and passed 1
        expect(received).toBe(lookAlike);
    });

    test("a primitive source warns (almost certainly a typo)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        watch("count" as any, () => {});

        expect(warn).toHaveBeenCalledWith(expect.stringContaining("primitive"));
        warn.mockRestore();
    });

    test("no stack overflow on rapid changes", async () => {
        const count = ref(0);
        const other = ref(0);

        watch(count, () => {
            other.value++;
        });

        for (let i = 0; i < 100; i++) {
            count.value++;
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(count.value).toBe(100);
    });

    test("mutually-watching refs stabilize instead of looping forever", async () => {
        const a = ref(0);
        const b = ref(0);

        watch(a, () => {
            if (b.value < 5) {
                b.value++;
            }
        });

        watch(b, () => {
            if (a.value < 5) {
                a.value++;
            }
        });

        a.value = 1;
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(a.value).toBeLessThan(100);
        expect(b.value).toBeLessThan(100);
    });
});
