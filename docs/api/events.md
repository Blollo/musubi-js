# API — Event bus

A minimal pub/sub for decoupled islands on the same page.

---

### `createEventBus()`

Returns an isolated bus:

```js
const bus = createEventBus();

bus.on("cart:add", item => { … });
bus.emit("cart:add", item);
bus.once("ready", init);
bus.off("cart:add", handler);
```

- `on(name, handler)` — subscribe.
- `off(name, handler)` — unsubscribe that exact handler.
- `emit(name, ...values)` — call every handler with the values.
- `once(name, handler)` — auto-unsubscribes after the first emit.

### Default bus

The module also exports `on`, `off`, `emit`, `once` bound to one shared bus —
convenient for page-level wiring. Prefer `createEventBus()` for anything
reusable: separate widgets sharing the global namespace is how name collisions
happen.

> `defineEmits` from the original library was removed — it implied
> per-component event scoping while actually emitting into the global bus.
> If you need a constrained emitter, wrap a bus of your own.
