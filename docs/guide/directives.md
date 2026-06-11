# Directives

Every directive has two spellings: `[name]` (compact) and `data-name`
(strict-HTML-valid). They are identical in behaviour.

Expressions are real JavaScript, evaluated against the mounted store with refs
unwrapped: `[text]="user.name"`, `[show]="count > 2 && !busy"`. See
[limitations](../limitations.md#template-expressions) for the boundaries.

## Text & HTML

```html
<span [text]="message"></span>     <!-- textContent — always safe -->
<p>Total: {price * qty} €</p>      <!-- {curly} interpolation in any text -->
<div [html]="trustedMarkup"></div> <!-- innerHTML — XSS hazard, see below -->
```

⚠️ `[html]` performs **no sanitization**. Never feed it user input — use
`[text]`/interpolation for anything that isn't developer-controlled.

## Conditionals

```html
<p [if]="loggedIn">Welcome back!</p>   <!-- removed from the DOM -->
<p [show]="loggedIn">Welcome back!</p> <!-- display: none -->
```

`[if]` fully unbinds its subtree while hidden (effects stopped, listeners
removed) and re-binds it fresh on show. `[show]` is cheaper for frequent
toggles; `[if]` is right for expensive or stateful subtrees.

## Lists

```html
<li data-for="item of items">{item}</li>
<li data-for="(item, index) of items">{index}: {item}</li>
<li data-for="(key, value) of someObject">{key} = {value}</li>
```

Add `:key` for keyed diffing — rows are reused and *moved* instead of
rebuilt, preserving DOM state (focus, animations, third-party decoration):

```html
<li data-for="todo of todos" :key="todo.id">{todo.text}</li>
```

Keys must be unique; duplicates are dropped with a console warning. Loops
nest, and inner loops see the outer loop's variables.

## Forms

```html
<input type="text"     [model]="draft" />
<input type="number"   [model]="amount" />     <!-- coerced to Number -->
<input type="checkbox" [model]="subscribed" />
<input type="radio" name="g" value="a" [model]="picked" />
<select [model]="plan">…</select>
```

`[model]` is two-way and understands dotted paths (`[model]="form.email"`),
including into ref-wrapped objects. Teach it custom elements with
[`registerModelAdapter`](../api/dom.md#registermodeladapter).

## Attributes, classes, state

```html
<a :href="url">…</a>                       <!-- any attribute -->
<div data-attr-id="rowId">…</div>          <!-- data-* twin -->
<button [disabled]="busy">Save</button>
<span [class]="{ active: isActive, error: hasError }"></span>
<span [class]="listOrString"></span>
```

`null`, `undefined`, and `false` **remove** the attribute (correct boolean-
attribute semantics); `true` sets it empty. `[class]` only manages the classes
it added — classes set by other scripts are left untouched.

## Events

```html
<button @click="save">Save</button>              <!-- function ref: called with the event -->
<button @click="save('draft')">Draft</button>    <!-- any expression -->
<button @click="remove(item, $event)">×</button> <!-- $event / $el available -->
<form data-onsubmit="submit($event)">…</form>    <!-- data-on* twin -->
```

Handlers are ordinary expressions — the same language as every other
directive. Note that *reassigning a ref* inside an expression
(`@click="count.value++"`) does **not** work (refs arrive unwrapped); call a
store method for mutations.

## Element refs

```html
<canvas [ref]="canvasEl"></canvas>
```

```js
const canvasEl = ref(null);
mount(root, { canvasEl });
// canvasEl.value === the <canvas> element
```

## Custom directives

```js
import { registerDirective, effect } from "musubi-js";

registerDirective("tooltip", (el, expression, store) => {
    effect(() => {
        el.title = String(evaluateSomehow(expression, store) ?? "");
    });
});
```

`registerDirective("tooltip", …)` enables both `[tooltip]="…"` and
`data-tooltip="…"`. Effects created inside the binder belong to the active
mount and die with `mount(...).stop()`.
