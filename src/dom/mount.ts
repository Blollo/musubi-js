// mount(root, store) — the primary dom api. walks the subtree, binds every
// directive against the given store, and returns a handle whose stop()
// tears everything down: effects are stopped, event listeners removed, and
// [if]/data-for placeholders swapped back to their original markup.
//
// each mount owns its own scanned-set and effect scope, so independent
// mounts (different roots, or the same root re-mounted after stop) never
// interfere with each other.

import { effectScope, runInScope } from "../reactivity/scope.js";
import type { EffectScope } from "../reactivity/scope.js";
import { getDirectiveEntries } from "./directives/registry.js";
import { bindFor } from "./directives/for/index.js";
import { bindEventListeners } from "./directives/on.js";
import { bindDynamicAttribute } from "./directives/attr.js";
import { processCurlyInterpolations } from "./interpolation.js";
import { isInsideNestedFor, isInsideNestedIf } from "./dom-utils.js";
import type { Store, ScanContext, MountHandle, MountOptions } from "./types.js";

function processElementBindings (el: Element, store: Store, ctx: ScanContext): void {
    // dynamic attribute bindings (:attr / data-attr-*).
    // snapshot the live NamedNodeMap before iterating because
    // removeAttribute() inside the loop would shift indices
    for (const attr of Array.from(el.attributes)) {
        const { name, value } = attr;

        if (name.startsWith("data-attr-") || name.startsWith(":")) {
            const realAttr = name.startsWith("data-attr-")
                ? name.replace("data-attr-", "")
                : name.replace(":", "");

            el.removeAttribute(name);
            bindDynamicAttribute(el, realAttr, value, store);
        }
    }

    // standard directives (ref, [text], [model], [if], [show], [disabled], [class], [html], custom)
    for (const [attrName, binder] of getDirectiveEntries()) {
        if (el.hasAttribute(attrName)) {
            binder(el, el.getAttribute(attrName)!, store, ctx);
        }
    }

    // event listeners (@click, data-onclick, …)
    bindEventListeners(el, store);
}

function scanTree (root: ParentNode, store: Store, ctx: ScanContext): void {
    // bind data-for directives first, to handle scoped loop variables.
    // templates inside another data-for or inside an [if] subtree are owned
    // by that binding's inner scan and skipped here.
    root.querySelectorAll("[data-for]").forEach(el => {
        if (
            ctx.scanned.has(el)
            || isInsideNestedFor(el, root)
            || isInsideNestedIf(el, root)
        ) {
            return;
        }

        ctx.scanned.add(el);
        bindFor(el, store, ctx);
    });

    // bind all other directives
    root.querySelectorAll("*").forEach(el => {
        // if already scanned, skip this element
        if (ctx.scanned.has(el)) {
            return;
        }

        // [if] subtrees are bound by bindIf into their own child scope —
        // touching them here would double-bind them after the first toggle
        if (isInsideNestedIf(el, root)) {
            return;
        }

        ctx.scanned.add(el);

        processElementBindings(el, store, ctx);
    });

    // bind curly bracket interpolations in a single walk over the whole tree
    // (per-element walks would be O(n²)). this also covers text nodes that are
    // direct children of root. the walker itself skips script/style contents
    // and the interiors of data-for templates and [if] subtrees — those are
    // interpolated by their own scan, with the right scope and ownership.
    processCurlyInterpolations(root, store, ctx);
}

// the scan context threads per-mount state (the scanned WeakSet) through the
// recursive parts of the pipeline — [if] re-scans, data-for row creation —
// without module-level globals, and without import cycles between mount.ts
// and the directive modules.
function createScanContext (): ScanContext {
    const ctx: ScanContext = {
        scanned: new WeakSet<Element>(),

        // Text node → { expr, runner } for every rendered interpolation, so
        // re-scans of [if] subtrees can re-bind nodes whose effect was stopped
        boundText: new WeakMap(),

        scan (root, store) {
            scanTree(root, store, ctx);
        },

        bindElement (el, store) {
            processElementBindings(el, store, ctx);
        },

        interpolate (root, store) {
            processCurlyInterpolations(root, store, ctx);
        },

        // clear the scanned marks of root's descendants (not root itself)
        // so a later re-scan binds them from scratch
        unmarkTree (root) {
            root.querySelectorAll("*").forEach(child => ctx.scanned.delete(child));
        }
    };

    return ctx;
}

/**
 * Bind every directive under root against the given store.
 * Returns a handle whose stop() tears the whole mount down.
 */
export function mount (root: ParentNode, store: Store, _options: MountOptions = {}): MountHandle {
    if (!root || typeof root.querySelectorAll !== "function") {
        throw new TypeError("[musubi] mount() expects a dom element (or document) as the first argument.");
    }

    if (store == null || typeof store !== "object") {
        throw new TypeError(
            "[musubi] mount() requires a store object as the second argument — " +
            "the implicit window default was removed because it silently exposes every global to template expressions."
        );
    }

    const scope = effectScope(null);
    const ctx   = createScanContext();

    runInScope(scope, () => scanTree(root, store, ctx));

    return {
        stop () {
            scope.stop();
        }
    };
}

/* <deprecated> */

// legacy alias — one shared scope/context across all calls reproduces the old
// module-global behaviour (re-scanning an already-scanned subtree is a no-op,
// and there is no teardown). prefer mount().
let legacyScope: EffectScope | null = null;
let legacyCtx: ScanContext | null = null;
let warned = false;

/** @deprecated Use mount(root, store) instead. */
export function scanBindings (root: ParentNode = document, store: Store = window as unknown as Store): void {
    if (!warned) {
        console.warn(
            "[musubi] scanBindings() is deprecated — use mount(root, store) instead. " +
            "mount gives each call its own scope, requires an explicit store, and returns a stop() handle."
        );
        warned = true;
    }

    legacyScope ||= effectScope(null);
    legacyCtx   ||= createScanContext();

    runInScope(legacyScope, () => scanTree(root, store, legacyCtx!));
}

/* </deprecated> */
