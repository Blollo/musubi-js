// [text] / data-text — bind an expression to el.textContent. always safe
// (textContent never parses HTML).

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindText (el: Element, expr: string, store: Store): void {
    effect(() => {
        const result = evalInScope(expr, store);
        el.textContent = result == null ? "" : result;
    });
}
