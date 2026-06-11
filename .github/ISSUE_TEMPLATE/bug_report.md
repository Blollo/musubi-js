---
name: Bug report
about: Something doesn't work the way the docs say it should
labels: bug
---

## What happened

<!-- A clear description of the bug. -->

## Minimal reproduction

<!-- The smallest HTML + store that shows the problem. A failing test is even better. -->

```html
<div id="app">
    <!-- … -->
</div>
```

```js
import { ref, mount } from "musubi-js";

mount(document.querySelector("#app"), { /* … */ });
```

## Expected behaviour

## Environment

- musubi-js version:
- Browser / Node version:
- Loaded via: <!-- npm + bundler / CDN ESM / IIFE script tag -->
