# API — DOM bindings

---

### `mount(root, store, options?)`

Scans `root`'s **descendants** (the root element's own attributes are not
processed) and binds every directive against `store`. The store is required —
there is no implicit `window` fallback.

Returns a handle:

```js
const app = mount(rootEl, store);
app.stop();
```

`stop()` stops every effect and watcher created by the mount, removes every
event listener the library added, removes rendered `data-for` rows, and swaps
`[if]`/`data-for` comment placeholders back to their original elements. The
tree can then be re-mounted (with the same or a different store).

Mounting the same subtree twice *without* stopping the first mount creates two
independent sets of bindings — almost never what you want.

`options` is reserved (a CSP-safe expression evaluator is the planned first
option).

### `scanBindings(root = document, store = window)` — deprecated

Legacy alias with the old semantics (shared global scanned-state, no teardown,
window default). Warns once. Use `mount`.

### `registerDirective(name, binder)`

Registers a custom directive under both syntaxes (`[name]`, `data-name`) for
all future mounts.

```js
registerDirective("focus", (el, expression, store, ctx) => {
    effect(() => {
        if (evalSomehow(expression, store)) {
            el.focus();
        }
    });
});
```

The binder runs once per matching element at scan time. Reactivity comes from
the effects you create inside it; they are owned by the mount that is
currently scanning. `ctx` (rarely needed) exposes the mount's scan context —
the same object the built-in `[if]`/`data-for` use to re-scan subtrees.

### `registerModelAdapter(match, adapter)`

Teaches `[model]` how to two-way-bind elements the built-ins don't cover
(custom elements, design-system widgets). Custom adapters are checked before
the built-ins, most recently registered first.

```js
import { registerModelAdapter, effect } from "naru-reactive";

registerModelAdapter(
    el => el.tagName === "MY-TOGGLE",
    (el, { get, set }) => {
        effect(() => { el.checked = !!get(); });
        el.addEventListener("change", () => set(el.checked));
    }
);
```

- `get()` evaluates the bound expression against the store.
- `set(value)` writes back (handles dotted paths and refs, and triggers
  dependents).

Built-in adapters: checkbox, radio, `<select>`, and a text/number fallback
(numeric inputs coerce to `Number`).
