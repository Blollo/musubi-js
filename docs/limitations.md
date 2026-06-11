# Limitations

Honest boundaries you should know before shipping. None of these are bugs —
they are design trade-offs of a small, no-build-step library.

## CSP: `'unsafe-eval'` is required

Template expressions are compiled with `new Function`. Pages whose
`Content-Security-Policy` does not allow `'unsafe-eval'` in `script-src`
**cannot evaluate template expressions** — every directive value and
`{interpolation}` will fail.

The evaluator is isolated in a single module (`src/dom/expression.js`)
precisely so a CSP-safe interpreter can be swapped in later; until then,
treat strict-CSP environments as unsupported. The reactivity engine itself
(`ref`, `computed`, `watch`, …) contains no eval and works under any CSP.

## Browser floor

The expression compiler uses regex lookbehind, which sets the effective
minimum versions:

| Browser | Minimum |
|---|---|
| Chrome / Edge | 62+ |
| Firefox | 78+ |
| **Safari** | **16.4+** (March 2023) |

Plus the general requirements: `Proxy`, `WeakMap`/`WeakSet`, `queueMicrotask`
— all comfortably older than the lookbehind floor.

## `[html]` is an XSS hazard

`[html]` assigns `innerHTML` with **no sanitization**. Bind only
developer-controlled strings. Anything that ever contained user input belongs
in `[text]` or `{interpolation}` (both use `textContent` and are always safe).

## Template expressions

- Expressions are real JavaScript *expressions* — not statements. `count + 1`
  works; `if (x) { … }` does not.
- Store refs arrive **unwrapped**. That makes reads pleasant
  (`[show]="count > 2"`) but means **assignments to refs don't work** in
  expressions: `@click="count.value++"` silently mutates a copied primitive.
  Mutate state in store methods instead (`@click="increment"`).
- In-place mutation of reactive *objects* does work (`@click="items.push(x)"`,
  `user.flags.busy = true`), because objects are passed by reference.
- Only **root identifiers that exist in the store** are injected. Globals
  (`Math`, `JSON`, …) are not reachable from expressions — precompute in the
  store or expose them explicitly (`mount(root, { ...store, Math })`).
- `$event` and `$el` are available inside `@event` handlers only.

## Template syntax edges

- **Literal braces cannot be escaped.** Any `{…}` in bound text is treated as
  an expression — there is no escape syntax. If you need to *display* braces,
  put the text in the store (`mount(root, { snippet: "{literal}" })`) and
  render `{snippet}`.
- **Dynamic URLs are your responsibility.** `:href="url"` sets whatever the
  expression produces — including `javascript:` URLs. If a URL ever derives
  from user input, validate its scheme before putting it in the store.
- **`[ref]` inside `data-for` rows is last-row-wins.** All rows share the
  store entry, so the ref ends up pointing at the final row's element; if the
  entry doesn't exist beforehand, it's created on the row's internal scope and
  is unreachable. Prefer `@event="handler(item, $event)"` to identify rows.

## Scanning rules worth knowing

- `mount(root, store)` binds directives on root's **descendants**; directives
  on the root element itself are ignored (text directly under the root *is*
  interpolated).
- `<script>` and `<style>` contents are never interpolated.
- Don't combine `data-for` and `[if]` on the same element — the `[if]` is
  ignored with a warning. Put `[if]` on a wrapper or filter the list in the
  store (a `computed` is perfect for this).
- Re-mounting a subtree that another active mount already bound double-binds
  it. Stop the first mount first.

## Not included (by design)

- **No components.** The original `ReactiveComponent`/`model:prop`/`defineEmits`
  layer was removed; if a component layer returns it will be a separate
  subpath export built on `registerDirective`.
- **No sanitizer, router, store library, or SSR hydration.** This library
  binds DOM you already rendered on the server.
