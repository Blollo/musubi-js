# Reactivity

The engine is a standalone module — it never touches the DOM and runs fine in
Node, workers, or tests. (`import { ref } from "naru-reactive"` tree-shakes
the entire DOM layer away under any bundler.)

## ref

A reactive box around one value.

```js
const count = ref(0);
count.value++;            // triggers subscribers
```

- Reads of `.value` inside an `effect`/`computed`/`watch` register a dependency.
- Writing an **identical** value is a no-op (no re-render).
- Arrays get special treatment: mutator methods (`push`, `splice`, `sort`, …)
  and index assignments (`arr.value[0] = x`) trigger automatically.
- Plain objects inside a ref are **not** deeply reactive. Either replace the
  object (`user.value = { ...user.value, name }`), use `reactive()`, or call
  `triggerRef(user)` after an in-place mutation. (`[model]="user.name"` does
  this for you.)

`isRef(v)` / `unref(v)` are the supported ways to detect/unwrap refs — they
check an internal brand, never the shape of the object.

## reactive

A deep reactive proxy for object-shaped state.

```js
const state = reactive({ user: { name: "Ada" }, tags: ["a"] });
state.user.name = "Grace";   // nested writes trigger
state.tags.push("b");        // arrays too
delete state.user.name;      // deletions too
```

Writes to `__proto__`/`constructor`/`prototype` are blocked (with a console
warning) to prevent prototype pollution.

## computed

Lazy, cached, derived values.

```js
const doubled = computed(() => count.value * 2);
doubled.value;     // recomputed only when a dependency changed
```

Invalidation is synchronous — reading `.value` right after a mutation gives
the fresh result, no `await` needed. Computeds are read-only: assignments
warn and are ignored.

## watch

```js
watch(source, (newValue, oldValue) => { ... }, options?)
```

- `source` can be a ref/computed, a getter function, or a `reactive` object
  (pass `{ deep: true }` to track every nested property).
- `oldValue` is a deep-cloned snapshot, so it's safe to compare against.
- `{ immediate: true }` fires the callback right away.
- Callbacks run **untracked** — reactive reads inside the callback don't
  subscribe the watcher (no accidental loops).
- Returns a runner with `.stop()`.

## effect

The low-level primitive everything else is built on.

```js
const runner = effect(() => {
    document.title = `${count.value} items`;
});
runner.stop();
```

Effects re-run in a batched microtask by default; pass `{ sync: true }` to
run synchronously on every trigger. A runaway loop (effects re-queueing each
other forever) is detected and aborted with an error after 100 flush
iterations instead of freezing the page.

## nextTick

```js
count.value++;
await nextTick();   // DOM bindings have re-rendered now
```
