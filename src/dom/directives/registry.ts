// directive registry — the name → binder table the scan pipeline walks for
// every element, plus the registerDirective() extension point.
//
// a binder has the shape (el, expression, store, ctx) => void, where ctx is
// the scan context of the owning mount (most binders ignore it; [if] uses it
// to re-scan its subtree). data-for is not in this table — it has its own
// scan pass because it must run before everything else.

import { bindElementRef } from "./el-ref.js";
import { bindText } from "./text.js";
import { bindModel } from "./model.js";
import { bindIf } from "./if.js";
import { bindShow } from "./show.js";
import { bindDisabled } from "./disabled.js";
import { bindClass } from "./class.js";
import { bindHTML } from "./html.js";
import type { DirectiveBinder } from "../types.js";

// insertion order is binding order per element — keep [if] early so the
// element is detached before later directives touch it, html last
const directives = new Map<string, DirectiveBinder>([
    ["ref",           bindElementRef],
    ["[ref]",         bindElementRef],

    ["data-text",     bindText],
    ["[text]",        bindText],

    ["data-model",    bindModel],
    ["[model]",       bindModel],

    ["data-if",       bindIf],
    ["[if]",          bindIf],

    ["data-show",     bindShow],
    ["[show]",        bindShow],

    ["data-disabled", bindDisabled],
    ["[disabled]",    bindDisabled],

    ["data-class",    bindClass],
    ["[class]",       bindClass],

    ["data-html",     bindHTML],
    ["[html]",        bindHTML]
]);

/**
 * Register a custom directive under both syntaxes: [name] and data-name.
 * The binder runs once per matching element at scan time; reactivity comes
 * from creating effects inside it (they are owned by the active mount scope).
 */
export function registerDirective (name: string, binder: DirectiveBinder): void {
    if (typeof name !== "string" || !/^[a-z][a-z0-9-]*$/i.test(name)) {
        throw new TypeError(
            `[naru] registerDirective: "${name}" is not a valid directive name — ` +
            `use a bare name like "tooltip" (it registers [tooltip] and data-tooltip).`
        );
    }

    if (typeof binder !== "function") {
        throw new TypeError("[naru] registerDirective: binder must be a function (el, expression, store, ctx).");
    }

    directives.set(`[${name}]`, binder);
    directives.set(`data-${name}`, binder);
}

export function getDirectiveEntries (): Iterable<[string, DirectiveBinder]> {
    return directives.entries();
}
