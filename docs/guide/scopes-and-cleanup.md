# Scopes & cleanup

Long-lived MPA pages accumulate and discard widgets: modals open and close,
tabs swap content, lists re-render. Effect scopes are how naru-reactive makes
sure discarded DOM can actually be garbage collected.

## The problem scopes solve

An `effect` subscribes to the refs it reads. If the element it updates is
removed from the page but the effect is never stopped, the subscription keeps
both the effect *and the detached element* alive — a classic leak.

## mount() owns everything it creates

Every effect, watcher, and event listener created while binding a tree belongs
to that mount's scope:

```js
const app = mount(widgetEl, store);
// …
app.stop();   // everything created by this mount is released
```

`stop()` also restores `[if]` and `data-for` placeholders to their original
markup, so the same tree can be re-mounted later (even with a different store).

The library uses scopes internally, too: each `data-for` row and each shown
`[if]` branch gets a child scope that is stopped the moment the row is removed
or the branch hides.

## Manual scopes

For reactive state that *isn't* tied to a mount:

```js
import { effectScope, runInScope, onScopeDispose } from "naru-reactive";

const scope = effectScope();

runInScope(scope, () => {
    effect(() => { /* … */ });
    watch(source, () => { /* … */ });

    // composable-style cleanup hooks:
    const id = setInterval(poll, 5000);
    onScopeDispose(() => clearInterval(id));
});

// later:
scope.stop();   // stops the effect, the watcher, and clears the interval
```

Scopes nest: a scope created while another is active becomes its child and is
stopped together with the parent. `effectScope(parent)` sets the parent
explicitly.

## onScopeDispose

`onScopeDispose(fn)` registers `fn` on the currently active scope. It's the
hook for composable helpers that allocate non-reactive resources (timers,
observers, listeners) and want to participate in their owner's teardown —
without knowing who that owner is. Outside any scope it is a silent no-op.
