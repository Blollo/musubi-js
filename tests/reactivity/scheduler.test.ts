import { describe, test, expect, vi } from "vitest";
import { ref, computed, effect, nextTick } from "../../src/index.js";
import { flushSync } from "../../src/reactivity/scheduler.js";

describe("scheduler", () => {
    test("multiple updates are batched into one effect run", async () => {
        const count = ref(0);
        let effectRuns = 0;

        effect(() => {
            count.value; // track
            effectRuns++;
        });

        await nextTick();
        const runsAfterInit = effectRuns;

        count.value = 1;
        count.value = 2;
        count.value = 3;

        await nextTick();

        expect(effectRuns - runsAfterInit).toBe(1);
    });

    test("computed invalidation is synchronous, no batching wait needed", () => {
        const count = ref(1);
        const doubled = computed(() => count.value * 2);

        count.value = 5;
        expect(doubled.value).toBe(10);
    });

    test("nextTick resolves after queued effects have flushed", async () => {
        const count = ref(0);
        let dummy;

        effect(() => {
            dummy = count.value;
        });

        count.value = 42;
        expect(dummy).toBe(0); // not flushed yet

        await nextTick();
        expect(dummy).toBe(42);
    });

    test("cascading effects (watch chains) drain within a single tick", async () => {
        const a = ref(0);
        const b = ref(0);
        let final;

        effect(() => {
            b.value = a.value * 10;
        });

        effect(() => {
            final = b.value;
        });

        a.value = 3;
        await nextTick();

        expect(final).toBe(30);
    });

    test("flushSync drains the queue immediately", () => {
        const count = ref(0);
        let dummy;

        effect(() => {
            dummy = count.value;
        });

        count.value = 9;
        expect(dummy).toBe(0);

        flushSync();
        expect(dummy).toBe(9);
    });

    test("self-triggering effects reach a steady state instead of looping", async () => {
        const count = ref(5);
        let runs = 0;

        // a clamping effect writes its own dependency — common and legitimate
        const runner = effect(() => {
            runs++;

            if (count.value > 3) {
                count.value = 3;
            }
        });

        await nextTick();

        expect(count.value).toBe(3);
        expect(runs).toBe(1); // an effect never re-triggers itself

        runner.stop();
    });

    test("mutual async loops are detected and aborted", () => {
        const a = ref(0);
        const b = ref(0);

        const runnerA = effect(() => {
            a.value = b.value + 1;
        });
        const runnerB = effect(() => {
            b.value = a.value + 1;
        });

        expect(() => flushSync()).toThrow(/infinite reactive loop/i);

        runnerA.stop();
        runnerB.stop();
    });

    test("mutual sync loops fail with a descriptive error, not a stack overflow", () => {
        const a = ref(0);
        const b = ref(0);

        const runnerA = effect(() => {
            a.value = b.value + 1;
        }, { sync: true });

        expect(() => {
            effect(() => {
                b.value = a.value + 1;
            }, { sync: true });
        }).toThrow(/infinite synchronous reactive loop/i);

        runnerA.stop();
    });

    test("a throwing effect doesn't block other queued effects", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const count = ref(0);
        let healthyRuns = 0;

        const bad = effect(() => {
            if (count.value > 0) {
                throw new Error("boom");
            }
        });
        const good = effect(() => {
            count.value;
            healthyRuns++;
        });

        count.value = 1;
        await nextTick();

        expect(healthyRuns).toBe(2); // initial + post-mutation run
        expect(error).toHaveBeenCalledWith("[naru] effect error:", expect.any(Error));

        bad.stop();
        good.stop();
        error.mockRestore();
    });
});
