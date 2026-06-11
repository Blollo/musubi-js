// data-for — parse the loop expression, swap the template for a comment
// placeholder, and dispatch to the keyed or unkeyed strategy.

import { ownerDocument } from "../../dom-utils.js";
import { bindForKeyed } from "./keyed.js";
import { bindForUnkeyed } from "./unkeyed.js";
import type { Store, ScanContext } from "../../types.js";

export function bindFor (el: Element, store: Store, ctx: ScanContext): void {
    const parent = el.parentNode!;
    const comment = ownerDocument(el).createComment("data-for placeholder");
    parent.replaceChild(comment, el); // remove template

    const expr    = el.getAttribute("data-for")!;
    const keyExpr = el.getAttribute(":key");

    // consume :key from the template so it isn't processed as a dynamic
    // attribute binding when each clone is scanned
    if (keyExpr) {
        el.removeAttribute(":key");
    }

    // match: (item, index) of items                    — array (2 vars)
    // match: item of items                             — array (1 var)
    // match: (key, value, index) of obj                — object (3 vars)
    const match = expr.match(/\(?\s*(\w+)(?:\s*,\s*(\w+))?(?:\s*,\s*(\w+))?\s*\)?\s+of\s+(.+)/);

    if (!match) {
        console.error("[naru] invalid data-for expression:", expr);

        return;
    }

    const [, var1, var2, var3, sourceExpr] = match;

    if (keyExpr) {
        bindForKeyed(el, store, parent, comment, var1, var2, var3, sourceExpr, keyExpr, ctx);
    }
    else {
        bindForUnkeyed(el, store, parent, comment, var1, var2, var3, sourceExpr, ctx);
    }
}
