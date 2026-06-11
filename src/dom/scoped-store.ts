// store utilities for the dom layer:
//   • createScopedStore — the loop/iteration store chain (Object.create)
//   • setDeep           — write a (possibly dotted) template expression path back into the store

import { isRef, triggerRef } from "../reactivity/ref.js";
import type { Store } from "./types.js";

// scoped store — own properties shadow the parent store, which stays
// reachable through the prototype chain (reads, `in` checks, and evalInScope
// key resolution all walk it natively — no proxy needed on this hot path).
// scopeVars may contain plain values (unkeyed loop path) or refs (keyed path);
// refs are unwrapped by evalInScope at evaluation time, so templates are
// written the same way regardless of which path created the row.
export function createScopedStore (parentStore: Store, scopeVars: Store): Store {
    const scoped: Store = Object.create(parentStore);

    for (const [k, v] of Object.entries(scopeVars)) {
        scoped[k] = v;
    }

    return scoped;
}

// path segments that would let a binding expression walk into the prototype
// machinery (e.g. [model]="constructor.prototype.x"). templates are
// developer-controlled, but they are also sometimes assembled server-side —
// refuse outright rather than trust every template author forever.
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

// write `value` into the store at the path described by `expr`
// (e.g. "count", "user.name", "form.address.city"), unwrapping refs along
// the way and creating intermediate objects as needed.
export function setDeep (store: Store, expr: string, value: any): void {
    if (!expr || !expr.trim()) {
        return;
    }

    const parts = expr.split(".").map(p => p.trim());

    if (parts.some(p => FORBIDDEN_SEGMENTS.has(p))) {
        console.warn(`[musubi] blocked write to "${expr}" — prototype-related path segments are not allowed.`);

        return;
    }

    const baseKey = parts[0];
    const base = store[baseKey];

    const baseIsRef = isRef(base);

    // if single-level key, set directly
    if (parts.length === 1) {
        if (baseIsRef) {
            base.value = value;
        }
        else {
            store[baseKey] = value;
        }

        return;
    }

    // if multi-level (like user.name), make sure base is an object
    let obj = baseIsRef ? base.value : base;

    if (obj == null || typeof obj !== "object") {
        obj = {};

        if (baseIsRef) {
            base.value = obj;
        }
        else {
            store[baseKey] = obj;
        }
    }

    for (let i = 1; i < parts.length - 1; i++) {
        const k = parts[i];

        if (!(k in obj) || obj[k] == null || typeof obj[k] !== "object") {
            obj[k] = {};
        }

        obj = obj[k];
    }

    const last   = parts[parts.length - 1];
    const target = obj[last];

    if (isRef(target)) {
        target.value = value;
    }
    else {
        obj[last] = value;
    }

    // the inner object of a ref was mutated in place — its identity didn't
    // change, so a plain re-assignment would be suppressed by the ref's
    // equality check. force-notify the ref's subscribers instead so every
    // binding reading a nested path (e.g. "user.name") re-renders.
    if (baseIsRef) {
        triggerRef(base);
    }
}
