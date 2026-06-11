// [html] / data-html — bind an expression to el.innerHTML.
//
// ⚠️  XSS WARNING: innerHTML is set directly from the store expression with no
// sanitization. Only bind trusted, developer-controlled strings here — never
// render raw user input with [html]. Use [text] / curly interpolation instead,
// which sets textContent and is always safe.

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindHTML (el: Element, expr: string, store: Store): void {
    effect(() => {
        const result = evalInScope(expr, store);
        el.innerHTML = result == null ? "" : result;
    });
}
