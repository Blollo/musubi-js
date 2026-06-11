# Getting started

naru-reactive adds Vue-style reactivity to server-rendered, multi-page sites.
You write normal HTML, sprinkle directives on it, and bind it to a small
JavaScript store. There is no build step, no router, no component tree — each
page (or each widget on a page) is its own little reactive island.

## 1. Install

```sh
npm install naru-reactive
```

or use a CDN (see the [README](../../README.md#install)).

## 2. Mount a store

```html
<div id="greeter">
    <input type="text" [model]="name" placeholder="Your name" />
    <p [if]="name">Hello, {name}!</p>
</div>

<script type="module">
    import { ref, mount } from "naru-reactive";

    const app = mount(document.querySelector("#greeter"), {
        name: ref("")
    });

    // later, if this widget is removed from the page:
    // app.stop();
</script>
```

Three things to notice:

1. **The store is explicit.** Only the keys you pass to `mount` are visible to
   template expressions. (Globals are *not* implicitly available.)
2. **Refs are unwrapped in templates.** You write `name`, not `name.value`,
   inside directives and `{interpolations}`.
3. **`mount` returns a handle.** `app.stop()` stops every effect, removes every
   listener the library added, and restores `[if]`/`data-for` placeholder markup.

## 3. Derive and react

```js
import { ref, computed, watch, mount } from "naru-reactive";

const price = ref(100);
const qty   = ref(2);
const total = computed(() => price.value * qty.value);

watch(total, (now, before) => {
    console.log(`total went from ${before} to ${now}`);
});

mount(document.querySelector("#cart"), { price, qty, total });
```

Updates are batched in a microtask: changing `price` and `qty` in the same
tick re-renders once. Use `await nextTick()` when you need the DOM to be
up to date after a mutation.

## 4. Multiple islands

Each `mount` is independent — a typical product page might have a cart widget,
a search box, and a gallery, each with its own store. If two islands need to
talk, use an [event bus](../api/events.md).

Next: the [reactivity guide](reactivity.md) and the [directives guide](directives.md).
