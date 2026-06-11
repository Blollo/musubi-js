// [class] / data-class — add classes from a string, array, or
// { className: condition } object.
//
// only classes added by this binding are removed on re-run — classes added
// by third-party scripts after binding are left alone (a real scenario on
// the multi-page sites this library targets).

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

function resolveClasses (value: unknown): string[] {
    if (typeof value === "string") {
        return value.split(/\s+/).filter(Boolean);
    }

    if (Array.isArray(value)) {
        return value.flatMap(cls => String(cls).split(/\s+/)).filter(Boolean);
    }

    if (value && typeof value === "object") {
        return Object.entries(value)
            .filter(([, active]) => active)
            .flatMap(([cls]) => cls.split(/\s+/))
            .filter(Boolean);
    }

    return [];
}

export function bindClass (el: Element, expr: string, store: Store): void {
    let applied: string[] = [];

    effect(() => {
        const next = resolveClasses(evalInScope(expr, store));

        // drop only the classes this binding added that are no longer wanted
        for (const cls of applied) {
            if (!next.includes(cls)) {
                el.classList.remove(cls);
            }
        }

        if (next.length > 0) {
            el.classList.add(...next);
        }

        applied = next;
    });
}
