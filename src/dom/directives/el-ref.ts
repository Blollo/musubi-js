// ref / [ref] — expose the element itself on the store as a ref, so script
// code can reach dom nodes declared in the template.

import { ref } from "../../reactivity/ref.js";
import type { Store } from "../types.js";

export function bindElementRef (el: Element, name: string, store: Store): void {
    if (!name) {
        return;
    }

    if (!store[name]) {
        store[name] = ref(null);
    }

    store[name].value = el;
}
