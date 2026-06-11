// [model] / data-model — two-way binding between a form element and a store
// expression. element behaviours are pluggable: registerModelAdapter() lets
// applications teach [model] about their own custom elements (this replaces
// the app-specific element names that used to be hardcoded here).
//
// an adapter is a function (el, { get, set }) — `get()` evaluates the bound
// expression, `set(value)` writes back into the store. adapters typically
// create an effect for the store→element direction and add an event listener
// for the element→store direction; listeners registered through listen()
// are removed automatically when the owning mount/scope is stopped.

import { effect } from "../../reactivity/effect.js";
import { onScopeDispose } from "../../reactivity/scope.js";
import { evalInScope } from "../expression.js";
import { setDeep } from "../scoped-store.js";
import type { Store, ModelAdapter, ModelAdapterApi } from "../types.js";

// add a listener that is removed when the active scope is stopped —
// this is what makes mount(...).stop() a full teardown
export function listen (el: Element, eventName: string, handler: (e: Event) => void): void {
    el.addEventListener(eventName, handler);
    onScopeDispose(() => el.removeEventListener(eventName, handler));
}

/* <built-in adapters> */

function checkboxAdapter (el: Element, { get, set }: ModelAdapterApi): void {
    const input = el as HTMLInputElement;

    // when store changes -> update element
    effect(() => {
        input.checked = !!get();
    });

    // when element changes -> update store
    listen(input, "change", e => set((e.target as HTMLInputElement).checked));
}

function radioAdapter (el: Element, { get, set }: ModelAdapterApi): void {
    const input = el as HTMLInputElement;

    effect(() => {
        input.checked = get() === input.value;
    });

    listen(input, "change", e => {
        if ((e.target as HTMLInputElement).checked) {
            set(input.value);
        }
    });
}

function selectAdapter (el: Element, { get, set }: ModelAdapterApi): void {
    const select = el as HTMLSelectElement;

    effect(() => {
        const val = get();

        if (select.value !== String(val ?? "")) {
            select.value = val ?? "";
        }
    });

    listen(select, "change", () => set(select.value));
}

function inputAdapter (el: Element, { get, set }: ModelAdapterApi): void {
    const input = el as HTMLInputElement;
    const isNumeric = input.type === "number" || input.type === "range";

    effect(() => {
        const val = get();

        // don't clobber an equivalent in-progress entry: while typing "05" or
        // "1." the store holds the coerced number, and rewriting the field
        // with it would jump the caret and eat what the user typed
        if (isNumeric && input.value !== "" && Number(input.value) === val) {
            return;
        }

        const next = val ?? "";

        if (input.value !== String(next)) {
            input.value = next;
        }
    });

    listen(input, "input", e => {
        const raw = (e.target as HTMLInputElement).value;

        // coerce to number for numeric inputs so the store stays the right type
        if (isNumeric) {
            set(raw === "" ? "" : Number(raw));
        }
        else {
            set(raw);
        }
    });
}

const builtinAdapters: { match: (el: Element) => boolean; adapter: ModelAdapter }[] = [
    { match: el => (el as HTMLInputElement).type === "checkbox", adapter: checkboxAdapter },
    { match: el => (el as HTMLInputElement).type === "radio",    adapter: radioAdapter },
    { match: el => el.tagName === "SELECT",                      adapter: selectAdapter },
    { match: () => true,                                         adapter: inputAdapter }
];

/* </built-in adapters> */

// user-registered adapters — checked before the built-ins, most recent first,
// so applications can override built-in behaviour for specific elements
const customAdapters: { match: (el: Element) => boolean; adapter: ModelAdapter }[] = [];

/** Teach [model] how to bind a custom element. Custom adapters are checked before built-ins. */
export function registerModelAdapter (match: (el: Element) => boolean, adapter: ModelAdapter): void {
    if (typeof match !== "function" || typeof adapter !== "function") {
        throw new TypeError(
            "[musubi] registerModelAdapter(match, adapter) expects two functions: " +
            "a matcher (el) => boolean and an adapter (el, { get, set }) => void."
        );
    }

    customAdapters.unshift({ match, adapter });
}

export function bindModel (el: Element, expr: string, store: Store): void {
    const api: ModelAdapterApi = {
        get: () => evalInScope(expr, store),
        set: value => setDeep(store, expr, value)
    };

    for (const { match, adapter } of [...customAdapters, ...builtinAdapters]) {
        if (match(el)) {
            adapter(el, api);

            return;
        }
    }
}
