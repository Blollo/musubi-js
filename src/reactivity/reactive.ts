// reactive() — deep reactive proxy over a plain object, with per-property
// subscriber sets, key-enumeration tracking, prototype-pollution guards,
// and array support via the patched array prototype.

import { track, trigger } from "./effect.js";
import type { Subscribers } from "./effect.js";
import { createArrayProxy } from "./array.js";

// weakmap to cache reactive proxies
const reactiveMap = new WeakMap<object, any>();

// pseudo-property that key-enumeration subscribes to: effects that iterate
// the object (Object.keys, for…in, data-for over objects) re-run when a
// property is added or removed — not just when an existing one changes
const ITERATE_KEY = Symbol("naru.iterate");

/** True for proxies created by reactive(). */
export function isReactive (value: unknown): boolean {
    return !!(value && typeof value === "object" && (value as any).__v_isReactive === true);
}

/** Deep reactive proxy over a plain object. */
export function reactive<T extends object> (target: T): T;
export function reactive (target: any): any {
    if (!target || typeof target !== "object") {
        console.warn("[naru] reactive() expects an object");

        return target;
    }

    if (target.__v_isReactive) {
        return target;
    }

    // return existing proxy if already reactive
    if (reactiveMap.has(target)) {
        return reactiveMap.get(target);
    }

    // map to store subscribers for each property
    const subsMap = new Map<PropertyKey, Subscribers>();

    const getSubscribers = (prop: PropertyKey): Subscribers => {
        if (!subsMap.has(prop)) {
            subsMap.set(prop, new Set());
        }

        return subsMap.get(prop)!;
    };

    const handler: ProxyHandler<any> = {
        get (target, prop) {
            // don't intercept internal properties
            if (prop === "__v_isReactive") {
                return true;
            }

            if (prop === "__proto__" || prop === "constructor" || prop === "prototype") {
                return target[prop];
            }

            track(getSubscribers(prop));

            const value = target[prop];

            if (value && typeof value === "object") {
                // arrays need the patched prototype + index-assignment proxy so
                // that mutator methods (push, pop, splice…) call trigger().
                // reactive() alone cannot intercept those because they bypass the
                // proxy's set trap and operate directly on the raw target.
                if (Array.isArray(value)) {
                    // reuse the per-property subscriber set so reads and mutations
                    // share the same set of dependents
                    if (!(value as any).__v_subs) {
                        // store the proxy back on the raw target so the index-assignment
                        // interception is preserved on subsequent reads
                        target[prop] = createArrayProxy(value, getSubscribers(prop));
                    }

                    return target[prop];
                }

                // recursively make nested plain objects reactive
                return reactive(value);
            }

            return value;
        },
        set (target, prop, newVal) {
            // prototype-pollution guard. returning false would throw a cryptic
            // TypeError in strict mode — block the write with a warning instead.
            if (prop === "__proto__" || prop === "constructor" || prop === "prototype") {
                console.warn(`[naru] blocked assignment to "${String(prop)}" on a reactive object.`);

                return true;
            }

            const hadKey = Object.prototype.hasOwnProperty.call(target, prop);
            const oldVal = Reflect.get(target, prop);

            if (hadKey && oldVal === newVal) {
                return true;
            }

            const result = Reflect.set(target, prop, newVal);
            trigger(getSubscribers(prop));

            // a brand-new key changes the result of key enumeration
            if (!hadKey) {
                trigger(getSubscribers(ITERATE_KEY));
            }

            return result;
        },
        deleteProperty (target, prop) {
            const hasKey = prop in target;
            const result = delete target[prop];

            if (hasKey && result) {
                trigger(getSubscribers(prop));
                subsMap.delete(prop);
                trigger(getSubscribers(ITERATE_KEY));
            }

            return result;
        },
        has (target, prop) {
            // `"key" in obj` participates in tracking like a read
            if (prop !== "__v_isReactive") {
                track(getSubscribers(prop));
            }

            return Reflect.has(target, prop);
        },
        ownKeys (target) {
            // Object.keys / for…in / spread subscribe to additions & removals
            track(getSubscribers(ITERATE_KEY));

            return Reflect.ownKeys(target);
        }
    };

    const proxy = new Proxy(target, handler);
    reactiveMap.set(target, proxy);

    return proxy;
}
