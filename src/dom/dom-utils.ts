// small dom traversal guards shared by the scan pipeline and the
// interpolation compiler.

export function isInsideNestedFor (node: Node, topRoot: Node): boolean {
    let el: Element | null = node.parentElement;

    while (el && el !== topRoot) {
        if (el.hasAttribute("data-for")) {
            return true;
        }

        el = el.parentElement;
    }

    return false;
}

// true when node lives inside an element bound by [if]/data-if (strictly
// between node and topRoot). such subtrees are owned by the [if] binding's
// inner scan — the outer scan must leave them alone, exactly like nested
// data-for templates, or toggling would accumulate duplicate bindings.
export function isInsideNestedIf (node: Node, topRoot: Node): boolean {
    let el: Element | null = node.parentElement;

    while (el && el !== topRoot) {
        if (el.hasAttribute("data-if") || el.hasAttribute("[if]")) {
            return true;
        }

        el = el.parentElement;
    }

    return false;
}

export function isInsideIgnoredTag (node: Node, root: Node): boolean {
    let currentNode: Node | null = node;

    // walk up the dom tree from the text node
    while (currentNode && currentNode !== root) {
        // check if the current node is one of the ignored tag names
        // (nodeType 1 = element node)
        if (currentNode.nodeType === 1) {
            const tagName = (currentNode as Element).tagName.toUpperCase();

            if (tagName === "SCRIPT" || tagName === "STYLE") {
                return true;
            }
        }

        currentNode = currentNode.parentNode;
    }

    return false;
}

// document that owns a node — works when root is the document itself,
// a regular element, or a detached element (e.g. an [if] branch)
export function ownerDocument (node: Node): Document {
    return node.nodeType === 9 ? (node as Document) : (node.ownerDocument as Document);
}
