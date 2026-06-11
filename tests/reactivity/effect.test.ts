import { describe, test, expect } from "vitest";
import { ref, effect, nextTick } from "../../src/index.js";

describe("effect", () => {
    test("runs immediately", () => {
        let dummy;

        effect(() => {
            dummy = "ran";
        });

        expect(dummy).toBe("ran");
    });

    test("tracks dependencies", async () => {
        const count = ref(0);
        let dummy;

        effect(() => {
            dummy = count.value;
        });

        expect(dummy).toBe(0);

        count.value = 7;
        await nextTick();

        expect(dummy).toBe(7);
    });

    test("can be stopped", async () => {
        const count = ref(0);
        let dummy = 0;

        const runner = effect(() => {
            dummy = count.value;
        });

        expect(dummy).toBe(0);

        runner.stop();
        count.value = 1;
        await nextTick();

        expect(dummy).toBe(0); // should not update
    });

    test("stopped effect ignores manual invocation", () => {
        let dummy = 0;

        const runner = effect(() => {
            dummy++;
        });

        runner.stop();
        runner(); // should not run

        expect(dummy).toBe(1); // only initial run
    });

    test("cleanup on re-run: stale branch dependencies are dropped", async () => {
        const condition = ref(true);
        const value1 = ref(1);
        const value2 = ref(2);
        let dummy;
        let runs = 0;

        effect(() => {
            runs++;
            dummy = condition.value ? value1.value : value2.value;
        });

        expect(dummy).toBe(1);

        condition.value = false;
        await nextTick();
        expect(dummy).toBe(2);

        const runsBefore = runs;

        // value1 is no longer a dependency — changing it must not re-run
        value1.value = 100;
        await nextTick();

        expect(runs).toBe(runsBefore);
    });

    test("sync effects run immediately on trigger, without batching", () => {
        const count = ref(0);
        const seen: number[] = [];

        effect(() => {
            seen.push(count.value);
        }, { sync: true });

        count.value = 1;
        count.value = 2;

        // no await — sync effects don't wait for a microtask
        expect(seen).toEqual([0, 1, 2]);
    });

    test("nested effects restore the outer tracking context", async () => {
        const outer = ref(0);
        const inner = ref(0);
        let outerRuns = 0;
        let innerRuns = 0;

        effect(() => {
            outer.value;
            outerRuns++;

            effect(() => {
                inner.value;
                innerRuns++;
            }, { sync: true });
        });

        expect(outerRuns).toBe(1);
        expect(innerRuns).toBe(1);

        outer.value++;
        await nextTick();

        expect(outerRuns).toBe(2);
    });
});
