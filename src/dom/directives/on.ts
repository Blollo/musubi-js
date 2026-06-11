// @event / data-on* — event listeners.
//
// the handler value is a full template expression evaluated through the same
// evaluator as every other directive (no bespoke argument parser). two extra
// variables are in scope: $event (the dom event) and $el (the bound element).
//
//   @click="save"               → save is a function → called as save($event)
//   @click="save('draft')"      → expression runs; pass $event explicitly if needed
//   @click="items.push($event)" → any expression works
//
// listeners are removed automatically when the owning mount/scope is stopped.

import { onScopeDispose } from "../../reactivity/scope.js";
import { evalInScope } from "../expression.js";
import type { Store } from "../types.js";

export function bindEventListeners (el: Element, store: Store): void {
    for (const attr of Array.from(el.attributes)) {
        const { name, value } = attr;

        if (!name.startsWith("data-on") && !name.startsWith("@")) {
            continue;
        }

        const eventName = name.startsWith("data-on")
            ? name.slice("data-on".length).toLowerCase()
            : name.slice(1);

        bindEvent(el, eventName, value, store);
    }
}

function bindEvent (el: Element, eventName: string, expr: string, store: Store): void {
    const handler = (event: Event): void => {
        // child of the store so $event/$el shadow nothing and leak nowhere;
        // `in` checks and reads fall through to the store via the prototype chain
        const scope: Store = Object.create(store);
        scope.$event = event;
        scope.$el    = el;

        const result = evalInScope(expr, scope);

        // a bare function reference ("@click=\"save\"") evaluates to the
        // function itself — invoke it with the event
        if (typeof result === "function") {
            result(event);
        }
    };

    el.addEventListener(eventName, handler);
    onScopeDispose(() => el.removeEventListener(eventName, handler));
}
