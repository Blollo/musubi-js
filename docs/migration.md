# Migrating from the original `reactive.js` (unpublished 1.x)

The directive syntax in your HTML is unchanged. The differences are at the
JavaScript seam and in a few directive behaviours.

## scanBindings → mount

```js
// before
import { scanBindings } from "./src/core/reactive.js";
scanBindings();                       // document + window

// after
import { mount } from "naru-reactive";
const app = mount(document.body, store);   // explicit store, teardown handle
```

- **The store is required.** `window` is no longer the default — globals are
  not implicitly visible to expressions. Collect what your templates need
  into one object.
- `scanBindings` still exists as a deprecated alias (old semantics, warns
  once), so you can migrate incrementally.

## Event handlers are real expressions

`@click`/`data-on*` values are now evaluated like every other directive
expression instead of being parsed with a regex:

| 1.x | now |
|---|---|
| `@click="save"` → `save(event)` | same — function refs are called with the event |
| `@click="save('draft')"` → `save('draft', event)` | `save('draft')` — **the event is no longer appended**; write `save('draft', $event)` |
| `@click="store.method()"` → silently ignored | works |
| `@click="items.push('x')"` → silently ignored | works |

## `[model]` and custom elements

The hardcoded `HS-TOGGLE` / `HS-SEGMENT` / `HS-SELECT` support moved out of
the library. Recreate it in your app:

```js
import { registerModelAdapter, effect } from "naru-reactive";

registerModelAdapter(
    el => el.tagName === "HS-TOGGLE",
    (el, { get, set }) => {
        effect(() => { el.checked = !!get(); });
        el.addEventListener("change", e => set(e.target.checked));
    }
);
```

## Removed APIs

| Removed | Replacement |
|---|---|
| `model:prop` directive | none (returns with the future component package) |
| `defineEmits` | `createEventBus()` — a real isolated bus |
| `ReactiveComponent` docs | the class was already deleted from the source |

## Behaviour fixes you might notice

- Assigning to a `computed` no longer throws a strict-mode `TypeError`; it
  warns and is ignored.
- `[model]="user.name"` on a ref-wrapped object now updates every other
  binding that reads `user.name` (it used to go stale).
- Store entries that merely *look* like refs (`{ value: …, label: … }`) are no
  longer unwrapped — only real `ref()`/`computed()` values are.
- `[class]` no longer wipes classes added by third-party scripts.
- Toggling `[if]` no longer duplicates event listeners in its subtree.
