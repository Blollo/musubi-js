// {curly} text interpolation — finds { expr } occurrences in text nodes,
// splits them into static + dynamic text-node sequences, and creates one
// effect per dynamic part.
//
// binding is destructive: the { expr } template text is replaced by rendered
// nodes, so a later re-scan can't re-discover it from the markup alone.
// every dynamic node is therefore registered in the scan context (ctx.boundText)
// with its expression; when a re-scan encounters a node whose effect was
// stopped — an [if] subtree being shown again — it re-binds it in the scope
// that is active now.

import { effect } from "../reactivity/effect.js";
import { evalInScope } from "./expression.js";
import { isInsideNestedFor, isInsideNestedIf, isInsideIgnoredTag, ownerDocument } from "./dom-utils.js";
import type { Store, ScanContext } from "./types.js";

type Part =
    | { type: "static"; value: string }
    | { type: "expr"; expr: string };

export function processCurlyInterpolations (root: ParentNode, scope: Store, ctx?: ScanContext): void {
    // NodeFilter.SHOW_TEXT === 4 — literal avoids depending on the global
    const walker = ownerDocument(root).createTreeWalker(root, 4, null);
    const textNodes: Text[] = [];
    const reboundNodes: Text[] = [];

    let node: Node | null;

    while ((node = walker.nextNode())) {
        const textNode = node as Text;

        // skip nested data-for / [if] subtrees so their own pass handles them
        // with the right scope and ownership
        if (
            isInsideNestedFor(textNode, root)
            || isInsideNestedIf(textNode, root)
            || isInsideIgnoredTag(textNode, root)
        ) {
            continue;
        }

        // a dynamic node from a previous pass whose effect was stopped
        // (hidden [if] branch) — re-bind it in the current scope
        const record = ctx?.boundText.get(textNode);

        if (record) {
            if (record.runner.stopped) {
                reboundNodes.push(textNode);
            }

            continue;
        }

        // match { expr }
        if (/\{[^}]+\}/.test(textNode.textContent ?? "")) {
            textNodes.push(textNode);
        }
    }

    reboundNodes.forEach(n => bindExpressionNode(n, ctx!.boundText.get(n)!.expr, scope, ctx));
    textNodes.forEach(n => bindCurlyInterpolations(n, scope, ctx));
}

function bindExpressionNode (node: Text, expr: string, scope: Store, ctx: ScanContext | undefined): void {
    const runner = effect(() => {
        const v = evalInScope(expr, scope);
        node.textContent = v == null ? "" : String(v);
    });

    if (ctx) {
        ctx.boundText.set(node, { expr, runner });
    }
}

function bindCurlyInterpolations (node: Text, scope: Store, ctx: ScanContext | undefined): void {
    const original = node.textContent ?? "";

    // find all { expr } occurrences
    const matches = [...original.matchAll(/\{([^}]+)\}/g)];

    if (matches.length === 0) {
        return;
    }

    // split into static + dynamic parts
    const parts: Part[] = [];
    let lastIndex = 0;

    for (const match of matches) {
        const [full, expr] = match;
        const idx = match.index;

        if (idx > lastIndex) {
            parts.push({ type: "static", value: original.slice(lastIndex, idx) });
        }

        parts.push({ type: "expr", expr: expr.trim() });
        lastIndex = idx + full.length;
    }

    if (lastIndex < original.length) {
        parts.push({ type: "static", value: original.slice(lastIndex) });
    }

    // turn the whole text node into a sequence of child text nodes
    node.textContent = "";
    const parentEl = node.parentNode!;
    const doc = ownerDocument(node);
    const nodes = parts.map(p => {
        const n = doc.createTextNode(p.type === "static" ? p.value : "");

        parentEl.insertBefore(n, node);

        return { p, n };
    });

    // remove original template node
    node.remove();

    // create one effect per expr-part
    nodes.forEach(({ p, n }) => {
        if (p.type !== "expr") {
            return;
        }

        bindExpressionNode(n, p.expr, scope, ctx);
    });
}
