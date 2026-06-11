# naru-reactive

Vue-Composition-API-style reactivity and DOM bindings for **traditional multi-page sites**.
Drop a `<script type="module">` on a server-rendered page — no build step, no virtual DOM,
no components. Zero runtime dependencies, ~7 kB min+gzip.

```html
<div id="app">
    <p>Count: {count} — doubled: {doubled}</p>
    <button @click="increment">+</button>
</div>

<script type="module">
    import { ref, computed, mount } from "naru-reactive";

    const count = ref(0);

    mount(document.querySelector("#app"), {
        count,
        doubled:   computed(() => count.value * 2),
        increment: () => count.value++
    });
</script>
```

## Install

```sh
npm install naru-reactive
```

Or without any tooling, straight from a CDN:

```html
<!-- ES module -->
<script type="module">
    import { ref, mount } from "https://esm.sh/naru-reactive";
</script>

<!-- classic script (exposes window.NaruReactive) -->
<script src="https://cdn.jsdelivr.net/npm/naru-reactive/dist/naru-reactive.iife.min.js"></script>
```

## What you get

- **Reactivity engine** — `ref`, `reactive`, `computed`, `watch`, `effect`, effect scopes;
  microtask batching, automatic dependency cleanup, infinite-loop protection.
  Works standalone (no DOM required).
- **HTML directives** — `[text]`, `[html]`, `[model]`, `[if]`, `[show]`, `[disabled]`,
  `[class]`, `:attr`, `@event`, `data-for` (with keyed `:key` diffing), `{curly}` interpolation.
  Every directive also has a `data-*` twin for strict-HTML setups.
- **`mount(root, store)`** — explicit, scoped, and disposable: `mount(...).stop()` tears
  everything down (effects, listeners, rendered rows).
- **Extension points** — `registerDirective()` for custom directives,
  `registerModelAdapter()` to teach `[model]` your custom elements.
- **Event bus** — `createEventBus()` for decoupled islands on the same page.
- **Written in TypeScript** — generated type definitions ship with the package;
  full IntelliSense even in plain `.js` files and `<script>` blocks.

## A taste of the directives

```html
<ul>
    <li data-for="todo of todos" :key="todo.id">
        <input type="checkbox" [model]="todo.done" />
        <span [class]="{ done: todo.done }">{todo.text}</span>
    </li>
</ul>
<p [if]="todos.length === 0">Nothing to do.</p>
```

## Documentation

- [Getting started](docs/guide/getting-started.md)
- [Reactivity guide](docs/guide/reactivity.md)
- [Directives guide](docs/guide/directives.md)
- [Scopes & cleanup](docs/guide/scopes-and-cleanup.md)
- [API reference](docs/api/)
- [Limitations](docs/limitations.md) — read this before shipping (CSP, browser floor, `[html]` XSS)
- [Migrating from 1.x / `scanBindings`](docs/migration.md)

## Examples

Runnable, plain-HTML examples live in [`examples/`](examples/):

```sh
git clone <repo> && cd naru-reactive
npm install
npm run dev    # opens the examples gallery
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Quick start: `npm install`, `npm test`, `npm run dev`.

## License

[MIT](LICENSE)
