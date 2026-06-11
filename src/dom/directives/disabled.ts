// [disabled] / data-disabled — bind an expression to the disabled property.

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindDisabled (el: Element, expr: string, store: Store): void {
    // every form control with a disabled property fits this shape
    const target = el as Element & { disabled: boolean };

    effect(() => {
        target.disabled = !!evalInScope(expr, store);
    });
}
