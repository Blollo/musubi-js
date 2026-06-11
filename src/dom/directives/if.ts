// [if] / data-if — conditionally mount an element. the element is swapped
// with a comment placeholder while hidden; on every show its subtree is
// (re-)scanned into a fresh child scope, and on hide that scope is stopped —
// effects die and listeners are removed, so toggling never accumulates
// duplicate bindings. the outer scan never descends into an [if] subtree
// (see isInsideNestedIf): this binding is the subtree's sole owner.

import { effect } from "../../reactivity/effect.js";
import { effectScope, runInScope, getActiveScope, onScopeDispose } from "../../reactivity/scope.js";
import type { EffectScope } from "../../reactivity/scope.js";
import { evalInScope } from "../expression.js";
import { ownerDocument } from "../dom-utils.js";
import type { Store, ScanContext } from "../types.js";

export function bindIf (el: Element, expr: string, store: Store, ctx: ScanContext): void {
    const parent = el.parentNode;

    // a detached element has no position to toggle around. this happens when
    // [if] and data-for share an element: the loop clones the template before
    // inserting it, so the clone has no parent yet when its directives bind.
    if (!parent) {
        console.warn(
            "[musubi] [if] needs a parent element and was ignored. " +
            "Don't combine [if] and data-for on the same element — put [if] on a wrapper " +
            "or filter the list in the store instead."
        );

        return;
    }

    const comment = ownerDocument(el).createComment("[if] placeholder");
    parent.replaceChild(comment, el); // remove element, keep position

    let isInserted = false;
    let innerScope: EffectScope | null = null;

    // the scope that owns this binding (the mount scope or an iteration scope),
    // captured now — at toggle time, inside a microtask flush, no scope is
    // active anymore, and an orphaned inner scope would survive mount.stop()
    const ownerScope = getActiveScope();

    effect(() => {
        const show = !!evalInScope(expr, store);

        if (show && !isInserted) {
            // scan into a fresh child scope so hide can tear everything down.
            // the scan binds descendant elements and interpolates the whole
            // subtree (including text directly under el). el's own directives
            // were already bound by the outer scan and must not run twice.
            innerScope = effectScope(ownerScope);

            runInScope(innerScope, () => {
                ctx.scan(el, store);
            });

            parent.insertBefore(el, comment);
            isInserted = true;
        }
        else if (!show && isInserted) {
            // stop every effect that belongs to the hidden subtree
            // (this also removes its event listeners via onScopeDispose)
            if (innerScope) {
                innerScope.stop();
                innerScope = null;
            }

            // clear scanned marks so the next show re-scans from scratch
            ctx.unmarkTree(el);

            if (el.parentNode) {
                parent.replaceChild(comment, el);
            }

            isInserted = false;
        }
    });

    // when the owning mount/scope is stopped, put the element back in place
    // of the placeholder so the dom returns to its pre-mount markup
    onScopeDispose(() => {
        if (innerScope) {
            innerScope.stop();
            innerScope = null;
        }

        if (isInserted) {
            comment.remove();
        }
        else if (comment.parentNode) {
            comment.parentNode.replaceChild(el, comment);
        }
    });
}
