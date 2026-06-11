import { describe, test, expect } from "vitest";
import { ref, effect, effectScope, runInScope, onScopeDispose, nextTick } from "../../src/index.js";

describe("effectScope", () => {
    test("stop() stops every effect created inside the scope", async () => {
        const count = ref(0);
        let dummy;

        const scope = effectScope();

        runInScope(scope, () => {
            effect(() => {
                dummy = count.value;
            });
        });

        count.value = 1;
        await nextTick();
        expect(dummy).toBe(1);

        scope.stop();
        count.value = 2;
        await nextTick();

        expect(dummy).toBe(1); // frozen after stop
    });

    test("child scopes are stopped with their parent", async () => {
        const count = ref(0);
        let dummy;

        const parent = effectScope();

        runInScope(parent, () => {
            const child = effectScope(); // implicit parent: the active scope

            runInScope(child, () => {
                effect(() => {
                    dummy = count.value;
                });
            });
        });

        parent.stop();
        count.value = 5;
        await nextTick();

        expect(dummy).toBe(0);
    });

    test("a stopped child detaches from its parent (no accumulation)", () => {
        const parent = effectScope();

        for (let i = 0; i < 50; i++) {
            const child = effectScope(parent);
            child.stop();
        }

        expect(parent.children.length).toBe(0);
    });

    test("runInScope restores the previous scope, even on throw", () => {
        const outer = effectScope();
        const inner = effectScope();

        runInScope(outer, () => {
            expect(() => {
                runInScope(inner, () => {
                    throw new Error("boom");
                });
            }).toThrow("boom");

            // outer is active again: effects created now belong to outer
            effect(() => {});
        });

        expect(outer.effects.length).toBe(1);
    });

    test("effects created outside any scope are unaffected by scope stops", async () => {
        const count = ref(0);
        let dummy;

        effect(() => {
            dummy = count.value;
        });

        const scope = effectScope();
        scope.stop();

        count.value = 3;
        await nextTick();

        expect(dummy).toBe(3);
    });
});

describe("onScopeDispose", () => {
    test("runs the callback when the scope is stopped", () => {
        const scope = effectScope();
        let disposed = false;

        runInScope(scope, () => {
            onScopeDispose(() => {
                disposed = true;
            });
        });

        expect(disposed).toBe(false);

        scope.stop();
        expect(disposed).toBe(true);
    });

    test("is a no-op outside any scope", () => {
        expect(() => {
            onScopeDispose(() => {});
        }).not.toThrow();
    });

    test("stop() is idempotent — callbacks fire once", () => {
        const scope = effectScope();
        let calls = 0;

        runInScope(scope, () => {
            onScopeDispose(() => calls++);
        });

        scope.stop();
        scope.stop();

        expect(calls).toBe(1);
    });
});
