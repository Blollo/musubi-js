// reactive array support — a patched prototype whose mutator methods call
// trigger(), plus a proxy that intercepts index assignments. used by both
// ref() (array values) and reactive() (array properties); internal only.

import { trigger } from "./effect.js";
import type { Subscribers } from "./effect.js";

const arrayMutatorMethods = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
] as const;

// create a patched array prototype where mutator methods call trigger().
// deliberately untyped internals: we're splicing into Array.prototype
// machinery, where the type system has nothing useful to say.
const patchedArrayMethods: any = Object.create(Array.prototype);

arrayMutatorMethods.forEach(methodName => {
    const originalMethod = (Array.prototype as any)[methodName];

    // override the method
    patchedArrayMethods[methodName] = function (this: any[], ...args: unknown[]) {
        // call the original array method to mutate the data
        const result = originalMethod.apply(this, args);

        // get the subscribers associated with this array (stored internally)
        const subs = (this as any).__v_subs as Subscribers | undefined;

        // manually trigger the side effects
        if (subs) {
            trigger(subs);
        }

        return result;
    };
});

export function createArrayProxy (arr: any[], subs: Subscribers): any[] {
    // attach subs reference and patched methods
    Object.defineProperty(arr, "__v_subs", {
        value: subs,
        enumerable: false,
        writable: true
    });
    Object.setPrototypeOf(arr, patchedArrayMethods);

    // wrap in proxy to intercept index assignments
    return new Proxy(arr, {
        set (target: any, prop, value) {
            // check if it's a numeric index
            const index = Number(prop);

            if (!isNaN(index) && index >= 0) {
                target[prop] = value;
                trigger(subs);

                return true;
            }

            // for other properties, set normally
            target[prop] = value;

            return true;
        }
    });
}
