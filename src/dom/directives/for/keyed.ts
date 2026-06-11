// keyed data-for — diff old rows against the new source by :key,
// reusing, moving, adding, and removing rows as needed.

import { effect } from "../../../reactivity/effect.js";
import { getActiveScope, onScopeDispose } from "../../../reactivity/scope.js";
import type { EffectScope } from "../../../reactivity/scope.js";
import { ref } from "../../../reactivity/ref.js";
import type { Ref } from "../../../reactivity/ref.js";
import { evalInScope } from "../../expression.js";
import { normalizeEntries, buildScopedVars } from "./entries.js";
import { createIteration } from "./iteration.js";
import type { Store, ScanContext } from "../../types.js";

interface KeyedRow {
    node: Element;
    scope: EffectScope;
    varRefs: Record<string, Ref>;
}

export function bindForKeyed (
    el: Element,
    store: Store,
    parent: Node,
    comment: Comment,
    var1: string,
    var2: string | undefined,
    var3: string | undefined,
    sourceExpr: string,
    keyExpr: string,
    ctx: ScanContext
): void {
    // Map<key, { node, scope, varRefs }>
    // varRefs is an object of refs stored on the scoped store so that
    // in-place updates to moved/retained rows automatically re-trigger
    // the effects that were bound inside those rows during the initial scan
    let rowsByKey = new Map<any, KeyedRow>();

    // captured at bind time — see unkeyed.ts
    const ownerScope = getActiveScope();

    effect(() => {
        const source = evalInScope(sourceExpr, store);
        const { isObject, entries } = normalizeEntries(source);

        const oldMap = rowsByKey;
        rowsByKey = new Map();

        // cursor tracks the insertion point as we walk entries in reverse.
        // each node is inserted immediately before the cursor, so processing
        // right-to-left places nodes in correct forward DOM order.
        let cursor: Node | null = comment;

        for (let i = entries.length - 1; i >= 0; i--) {
            const entry     = entries[i];
            const scopeVars = buildScopedVars(entry, var1, var2, var3, isObject);

            // evaluate the key expression against a minimal scoped context so
            // we can look the item up in the old map without a full DOM clone
            const keyScope: Store = Object.create(store);

            for (const [k, v] of Object.entries(scopeVars)) {
                keyScope[k] = v;
            }

            const key = evalInScope(keyExpr, keyScope);

            // guard: if we've already seen this key in the current render pass,
            // the user has duplicate keys. clean up the earlier duplicate to
            // prevent orphaned DOM nodes and leaked scopes.
            if (rowsByKey.has(key)) {
                console.warn(
                    `[musubi] data-for: duplicate :key "${key}" at index ${i}. ` +
                    `Each key must be unique — duplicates cause unexpected behaviour.`
                );

                const dup = rowsByKey.get(key)!;
                dup.scope.stop();

                // the cursor may be the node we're about to remove — advance it
                // first or the next insertBefore would target a detached node
                if (cursor === dup.node) {
                    cursor = dup.node.nextSibling;
                }

                dup.node.remove();
                rowsByKey.delete(key);
            }

            const existing = oldMap.get(key);

            if (existing) {
                // ── reuse existing row ────────────────────────────────────────
                oldMap.delete(key);

                // update the reactive refs that the row's effects depend on so
                // any bindings that reference loop variables re-render in place
                for (const [k, v] of Object.entries(scopeVars)) {
                    if (existing.varRefs[k]) {
                        existing.varRefs[k].value = v;
                    }
                }

                // move to the correct position if it isn't already there
                if (existing.node.nextSibling !== cursor) {
                    parent.insertBefore(existing.node, cursor);
                }

                cursor = existing.node;
                rowsByKey.set(key, existing);
            }
            else {
                // ── new row ───────────────────────────────────────────────────
                // wrap each loop variable as a ref so future updates to this
                // row (if it gets reused after a subsequent re-render) can be
                // pushed reactively without re-scanning the node
                const varRefs: Record<string, Ref> = {};

                for (const [k, v] of Object.entries(scopeVars)) {
                    varRefs[k] = ref(v);
                }

                const { node, scope } = createIteration(el, store, varRefs, ownerScope, ctx);

                parent.insertBefore(node, cursor);
                cursor = node;
                rowsByKey.set(key, { node, scope, varRefs });
            }
        }

        // ── remove rows that are no longer in the source ──────────────────────
        for (const { node, scope } of oldMap.values()) {
            scope.stop();
            node.remove();
        }
    });

    // when the owning mount/scope is stopped, remove the rendered rows and
    // put the template element back in place of the placeholder so the dom
    // returns to its pre-mount markup (and a future mount can re-bind it)
    onScopeDispose(() => {
        for (const { node, scope } of rowsByKey.values()) {
            scope.stop();
            node.remove();
        }

        rowsByKey = new Map();

        if (comment.parentNode) {
            comment.parentNode.replaceChild(el, comment);
        }
    });
}
