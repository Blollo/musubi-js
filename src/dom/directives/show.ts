// [show] / data-show — toggle visibility via inline display, keeping the
// element in the dom (unlike [if], which removes it).

import { effect } from "../../reactivity/effect.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindShow (el: Element, expr: string, store: Store): void {
    const target = el as HTMLElement;

    // capture the element's own inline display value (if any) so we can
    // restore it when showing. avoids getComputedStyle which may return
    // "" or "none" before first layout or inside a hidden parent.
    // restoring "" removes the inline override and lets CSS take over.
    const inlineDisplay = target.style.display;

    effect(() => {
        const visible = !!evalInScope(expr, store);

        if (visible) {
            target.style.display = inlineDisplay;
        }
        else {
            target.style.setProperty("display", "none", "important");
        }
    });
}
