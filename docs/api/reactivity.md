# API — Reactivity

All exports come from the package root: `import { ref } from "musubi-js"`.

---

### `ref(value?)`

Creates a reactive reference. Reads of `.value` are tracked; writes trigger
subscribers (identical non-array values are skipped). Arrays are wrapped so
mutator methods and index assignments trigger too. Passing an existing ref
returns it unchanged.

### `isRef(value)`

`true` only for values created by `ref()` or `computed()` (brand check —
a plain `{ value: … }` object is *not* a ref).

### `unref(value)`

`isRef(value) ? value.value : value`.

### `triggerRef(ref)`

Force a ref's subscribers to re-run after an in-place mutation of its inner
object (identity unchanged, so a normal write would be skipped). No-op on
non-refs.

### `reactive(target)`

Deep reactive proxy over a plain object. Per-property dependency tracking;
nested objects become reactive on read; arrays are wrapped like in `ref`;
`delete` triggers; prototype-pollution writes are blocked with a warning.
Calling it twice on the same target returns the same proxy. Non-objects warn
and are returned as-is.

### `isReactive(value)`

`true` for proxies created by `reactive()`.

### `computed(getter)`

Lazy cached derived value with synchronous invalidation. Read via `.value`.
Read-only — assignments warn and are ignored. Branded as a ref (`isRef` is
`true`).

### `watch(source, callback, options?)`

| source | tracked as |
|---|---|
| ref / computed | its `.value` |
| function | whatever it reads |
| reactive object | the object (every nested property with `{ deep: true }`) |

`callback(newValue, oldValue)` runs batched (never synchronously with the
mutation); `oldValue` is a deep-cloned snapshot. Options: `immediate`, `deep`.
Returns a runner with `.stop()`.

### `effect(fn, options?)`

Runs `fn` immediately and re-runs it when any tracked dependency changes.
Returns the runner (`runner()` to re-run manually, `runner.stop()` to dispose).
Dependencies are re-collected on every run, so conditional reads stay precise.

Options:

- `sync: boolean` — run on trigger immediately instead of batching.
- `lazy: boolean` *(advanced)* — don't run on creation.
- `scheduler: () => void` *(advanced)* — called on trigger instead of re-running.

### `effectScope(parent?)` / `runInScope(scope, fn)` / `onScopeDispose(fn)`

Ownership and teardown — see the [scopes guide](../guide/scopes-and-cleanup.md).

### `nextTick()`

Promise that resolves after the currently queued effects have flushed.
