// computed() — lazy, cached, dirty-flagged derived value.
// built ON the effect primitive: the getter runs inside a lazy effect whose
// custom scheduler marks the computed dirty and notifies readers synchronously.
// there is deliberately no second tracking implementation here.

import { effect, track, trigger } from "./effect.js";
import type { Subscribers } from "./effect.js";
import type { ReadonlyRef } from "./ref.js";

/** what computed() returns — a read-only ref. Assignments warn and are ignored. */
export type ComputedRef<T = any> = ReadonlyRef<T>;

/** Lazy cached derived value with synchronous invalidation. */
export function computed<T> (getter: () => T): ComputedRef<T> {
    const subs: Subscribers = new Set();

    let cached: T;
    let dirty = true;

    // the runner is a lazy effect: invoking it runs the getter with
    // dependency tracking active. when any dependency changes, the scheduler
    // fires instead of a re-run — it marks the computed as dirty and notifies
    // the computed's own subscribers (which will re-read .value and get the
    // fresh result). invalidation is synchronous.
    const runner = effect(getter, {
        lazy: true,
        scheduler () {
            if (!dirty) {
                dirty = true;
                trigger(subs);
            }
        }
    });

    // run the getter, re-track dependencies, and cache the result
    function recompute (): void {
        cached = runner() as T;
        dirty  = false;
    }

    // fully lazy: the getter doesn't run until .value is first read —
    // a computed that is never read costs nothing (and a throwing getter
    // surfaces at the read site, not at declaration)
    return new Proxy({ value: undefined }, {
        get (target, prop, receiver) {
            if (prop === "__v_isRef") {
                return true;
            }

            if (prop === "value") {
                if (dirty && !runner.stopped) {
                    recompute();
                }

                track(subs);

                return cached;
            }

            return Reflect.get(target, prop, receiver);
        },
        set (_target, prop) {
            // computed refs are read-only. returning false would make the
            // assignment throw a cryptic TypeError in strict mode (all module
            // code is strict) — warn with a useful message instead.
            console.warn(
                `[musubi] computed refs are read-only — assignment to "${String(prop)}" was ignored.`
            );

            return true;
        }
    }) as unknown as ComputedRef<T>;
}
