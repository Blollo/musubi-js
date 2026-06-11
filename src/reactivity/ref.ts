// ref() — a reactive box around a single value, plus the single source of
// truth for ref branding: isRef / unref are the ONLY sanctioned way to detect
// and unwrap refs anywhere in the library. duck-typed `"value" in v` checks
// are forbidden — they false-positive on plain objects that happen to have
// a `value` property.

import { track, trigger } from "./effect.js";
import type { Subscribers } from "./effect.js";
import { createArrayProxy } from "./array.js";

// type-level brand mirroring the runtime __v_isRef marker: a plain
// `{ value: … }` object must not pass for a Ref in the type system any more
// than it does at runtime. the symbol only exists in type space.
export declare const RefSymbol: unique symbol;

export interface Ref<T = any> {
    value: T;
    readonly [RefSymbol]: true;
}

/** the read-only face of a ref — what computed() returns */
export interface ReadonlyRef<T = any> {
    readonly value: T;
    readonly [RefSymbol]: true;
}

// internal key the ref proxy answers with a closure that force-triggers its
// subscribers. a symbol so it can never collide with (or leak into) user data.
const RefForceTrigger = Symbol("naru.refForceTrigger");

/** True only for values created by ref() or computed() — never duck-typed. */
export function isRef<T = any> (value: unknown): value is Ref<T> {
    return !!(value && typeof value === "object" && (value as any).__v_isRef === true);
}

/** Unwrap a ref; pass any other value through unchanged. */
export function unref<T> (value: T | Ref<T>): T {
    return isRef(value) ? (value.value as T) : (value as T);
}

/**
 * Force a ref's subscribers to re-run even though `ref.value` was not
 * reassigned — needed when the inner object of a ref was mutated in place
 * (e.g. setDeep writing a nested path of a ref-wrapped plain object).
 * No-op on non-refs.
 */
export function triggerRef (r: Ref): void {
    if (!isRef(r)) {
        return;
    }

    const force = (r as any)[RefForceTrigger];

    if (typeof force === "function") {
        force();
    }
}

/** Create a reactive box around a single value. */
export function ref<T> (value: T): Ref<T>;
export function ref<T = any> (): Ref<T | undefined>;
export function ref (initialValue?: any): any {
    if (isRef(initialValue)) {
        return initialValue;
    }

    const subs: Subscribers = new Set();

    // if it's an array, wrap it in a proxy
    if (Array.isArray(initialValue)) {
        initialValue = createArrayProxy(initialValue, subs);
    }

    const data = { value: initialValue };

    return new Proxy(data, {
        get (target, prop, receiver) {
            if (prop === "__v_isRef") {
                return true;
            }

            if (prop === RefForceTrigger) {
                return () => trigger(subs);
            }

            if (prop === "value") {
                track(subs);

                return target.value;
            }

            // fall through for all other properties (Symbol.toPrimitive,
            // Symbol.toStringTag, toJSON, etc.) so the ref behaves like
            // a normal object for inspection, serialisation, and duck-typing
            return Reflect.get(target, prop, receiver);
        },
        set (target, prop, newVal) {
            if (prop !== "value") {
                // returning false would make the assignment throw a cryptic
                // TypeError in strict mode (all module code) — warn instead
                console.warn(
                    `[naru] refs only expose .value — assignment to "${String(prop)}" was ignored.`
                );

                return true;
            }

            // if it's a new array, wrap it in a proxy
            if (Array.isArray(newVal) && !(newVal as any).__v_subs) {
                newVal = createArrayProxy(newVal, subs);
            }

            // skip trigger if the value hasn't changed.
            // arrays are exempt: their mutations go through the patched prototype
            // and trigger directly, so identity equality would wrongly suppress them.
            if (!Array.isArray(newVal) && target.value === newVal) {
                return true;
            }

            target.value = newVal;
            trigger(subs);

            return true;
        }
    });
}
