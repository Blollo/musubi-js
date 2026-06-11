// unkeyed data-for — full teardown + rebuild on every change.
// simple and always correct; prefer :key for large or stateful lists.

import { effect } from "../../../reactivity/effect.js";
import { getActiveScope, onScopeDispose } from "../../../reactivity/scope.js";
import type { EffectScope } from "../../../reactivity/scope.js";
import { evalInScope } from "../../expression.js";
import { normalizeEntries, buildScopedVars } from "./entries.js";
import { createIteration } from "./iteration.js";
import type { Store, ScanContext } from "../../types.js";

export function bindForUnkeyed (
    el: Element,
    store: Store,
    parent: Node,
    comment: Comment,
    var1: string,
    var2: string | undefined,
    var3: string | undefined,
    sourceExpr: string,
    ctx: ScanContext
): void {
    let children: Element[] = [];
    let iterationScopes: EffectScope[] = [];

    // captured at bind time — re-renders happen inside microtask flushes where
    // no scope is active, and rows created there must still belong to the mount
    const ownerScope = getActiveScope();

    effect(() => {
        const source = evalInScope(sourceExpr, store);
        const { isObject, entries } = normalizeEntries(source);

        // stop all effects owned by the previous iteration scopes before removing
        // clones so detached nodes can be garbage collected
        for (const scope of iterationScopes) {
            scope.stop();
        }

        iterationScopes = [];

        // remove previous clones
        children.forEach(node => node.remove());
        children = [];

        entries.forEach(entry => {
            const scopeVars = buildScopedVars(entry, var1, var2, var3, isObject);

            const { node, scope } = createIteration(el, store, scopeVars, ownerScope, ctx);

            iterationScopes.push(scope);
            parent.insertBefore(node, comment);
            children.push(node);
        });
    });

    // when the owning mount/scope is stopped, remove the rendered rows and
    // put the template element back in place of the placeholder so the dom
    // returns to its pre-mount markup (and a future mount can re-bind it)
    onScopeDispose(() => {
        iterationScopes.forEach(scope => scope.stop());
        iterationScopes = [];

        children.forEach(node => node.remove());
        children = [];

        if (comment.parentNode) {
            comment.parentNode.replaceChild(el, comment);
        }
    });
}
