// shared per-row helper for data-for: clone the template, build the scoped
// store, give the clone its own effect scope, and bind its subtree.

import { effectScope, runInScope } from "../../../reactivity/scope.js";
import type { EffectScope } from "../../../reactivity/scope.js";
import { createScopedStore } from "../../scoped-store.js";
import type { Store, ScanContext } from "../../types.js";

export interface IterationRow {
    node: Element;
    scope: EffectScope;
}

export function createIteration (
    el: Element,
    store: Store,
    scopeVars: Store,
    ownerScope: EffectScope | null,
    ctx: ScanContext
): IterationRow {
    const clone = el.cloneNode(true) as Element;
    clone.removeAttribute("data-for");

    const scopedStore = createScopedStore(store, scopeVars);

    // give the iteration its own scope so all its effects can be stopped
    // together when the row is removed or the list is torn down.
    // bindElement handles the clone's own directives (scan only visits
    // descendants); the scan's interpolation walk covers the whole subtree.
    const iterScope = effectScope(ownerScope);

    runInScope(iterScope, () => {
        ctx.bindElement(clone, scopedStore);
        ctx.scan(clone, scopedStore);
    });

    ctx.scanned.add(clone);

    return { node: clone, scope: iterScope };
}
