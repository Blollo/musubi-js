// watch() — observe a ref, a getter, or a reactive object and run a callback
// with (newValue, oldValue) when it changes. built on the effect primitive.

import { effect, untracked } from "./effect.js";
import type { EffectRunner } from "./effect.js";
import { isRef } from "./ref.js";
import type { Ref, ReadonlyRef } from "./ref.js";
import { isReactive } from "./reactive.js";

export interface WatchOptions {
    /** Fire the callback immediately with the current value. */
    immediate?: boolean;
    /** For reactive-object sources: track every nested property. */
    deep?: boolean;
}

export type WatchCallback<T = any> = (newValue: T, oldValue: T | undefined) => void;

export type WatchSource<T = any> = Ref<T> | ReadonlyRef<T> | (() => T) | object;

/**
 * Observe a source and run callback(newValue, oldValue) when it changes.
 * oldValue is a deep-cloned snapshot, so it is safe to compare against.
 * Returns a runner with .stop().
 */
export function watch<T> (
    source: Ref<T> | ReadonlyRef<T> | (() => T),
    callback: WatchCallback<T>,
    options?: WatchOptions
): EffectRunner;
export function watch<T extends object> (
    source: T,
    callback: WatchCallback<T>,
    options?: WatchOptions
): EffectRunner;
export function watch (
    source: any,
    callback: WatchCallback,
    options: WatchOptions = {}
): EffectRunner {
    // a primitive source has nothing to subscribe to — the callback would
    // never fire. almost always a typo (watch("count", …) instead of
    // watch(count, …)), so say it out loud.
    if (source === null || (typeof source !== "object" && typeof source !== "function")) {
        console.warn(
            `[musubi] watch() received a primitive (${JSON.stringify(source)}) — it will never trigger. ` +
            `Pass a ref, a getter function, or a reactive object.`
        );
    }

    let oldValue: any;
    let initialized = false;

    const deepClone = (val: any, seen = new WeakSet()): any => {
        if (val === null || typeof val !== "object") {
            return val;
        }

        // guard against circular references
        if (seen.has(val)) {
            return undefined;
        }

        seen.add(val);

        if (val instanceof Date) {
            return new Date(val.getTime());
        }

        if (Array.isArray(val)) {
            return val.map(item => deepClone(item, seen));
        }

        const cloned: Record<string, any> = {};

        for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
                cloned[key] = deepClone(val[key], seen);
            }
        }

        return cloned;
    };

    const watchEffect = effect(() => {
        let newValue: any;

        // if source is a function (getter), call it to track dependencies
        if (typeof source === "function") {
            newValue = source();
        }
        // if source is a ref/computed, access .value to track it
        else if (isRef(source)) {
            newValue = source.value;
        }
        // if source is a reactive object, track it (deep watch if options.deep)
        else if (isReactive(source)) {
            if (options.deep) {
                // deep access to track all nested properties — deepClone
                // traverses every key through the reactive proxy, triggering
                // track() for each, and returns a plain snapshot
                newValue = deepClone(source);
            }
            else {
                newValue = source;
            }
        }
        // otherwise use the source directly
        else {
            newValue = source;
        }

        if (initialized || options.immediate) {
            // run the callback without tracking to prevent the watcher from
            // accidentally subscribing to reactive reads made inside the callback
            untracked(() => callback(newValue, oldValue));
        }

        oldValue = deepClone(newValue);
        initialized = true;
    }, { sync: false }); // watch callbacks are async to prevent infinite loops

    // extend stop() to release the deep-clone snapshot so the watched object
    // graph can be garbage collected after the watcher is torn down
    const originalStop = watchEffect.stop.bind(watchEffect);

    watchEffect.stop = function (): void {
        originalStop();
        oldValue = undefined;
    };

    return watchEffect;
}
