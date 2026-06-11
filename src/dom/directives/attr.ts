// :attr / data-attr-* — bind an expression to an arbitrary attribute.

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindDynamicAttribute (el: Element, attrName: string, expr: string, store: Store): void {
    // when store changes -> update attribute
    effect(() => {
        const value = evalInScope(expr, store);

        // null, undefined, and false all mean "remove the attribute".
        // this is critical for boolean HTML attributes (hidden, disabled, readonly…)
        // where setAttribute("disabled", false) produces disabled="false" — still truthy.
        if (value === null || value === undefined || value === false) {
            el.removeAttribute(attrName);
        }
        else {
            // true → set the attribute with an empty value (boolean attribute convention)
            el.setAttribute(attrName, value === true ? "" : value);
        }
    });
}
