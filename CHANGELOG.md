# Changelog

This file is maintained by [Changesets](https://github.com/changesets/changesets);
entries below are generated from `.changeset/` files at release time.

## 0.1.0 (unreleased)

First public release — a restructure-and-harden of the original single-file
`reactive.js` library.

### Added

- `mount(root, store)` returning a `{ stop() }` teardown handle (replaces `scanBindings`).
- `isRef`, `unref`, `triggerRef`, `isReactive`, `nextTick` exports.
- `registerDirective(name, binder)` — custom directive extension point.
- `registerModelAdapter(match, adapter)` — pluggable `[model]` element support.
- `createEventBus()` — isolated event buses; default bus gains `once`.
- Shipped TypeScript definitions, ESM + IIFE builds with sourcemaps.

### TypeScript migration

- The entire source tree (and test suite) is now strict TypeScript; the
  published type definitions are generated from source instead of being
  hand-maintained.
- `Ref`/`ComputedRef` are type-branded to mirror the runtime `isRef` brand —
  a structural `{ value: … }` look-alike no longer passes for a ref in the
  type system either.
- New exported types: `Store`, `ScanContext`, `DirectiveBinder`,
  `ModelAdapter`, `ModelAdapterApi`, `MountHandle`, `MountOptions`,
  `EventBus`, `EventHandler`, `EffectRunner`, `EffectOptions`, `WatchOptions`,
  `WatchCallback`, `WatchSource`, `Ref`, `ReadonlyRef`, `ComputedRef`; the
  `EffectScope` class is exported as a value.
- Runtime behaviour is unchanged — the 181-test suite passes as-is.

### Hardened (post-restructure review pass)

- An effect that writes its own dependency (e.g. clamping) reaches a steady
  state instead of looping; mutual sync loops abort with a descriptive error
  instead of a stack overflow.
- A throwing effect (or event-bus handler) no longer aborts the rest of the
  queue — failures are logged and isolated.
- `reactive()` tracks key enumeration and `in` checks: `data-for` over a
  reactive object now re-renders when properties are added, not just changed.
- `computed()` is fully lazy — the getter doesn't run until first read.
- `[model]` writes through `setDeep` refuse prototype-related path segments.
- Numeric `[model]` inputs no longer clobber equivalent in-progress entries
  (typing "05" or "1." keeps the caret and text).
- `data-for` + `[if]` on the same element warns instead of crashing.
- `watch()` warns when given a primitive source (a typo'd `watch("count", …)`
  would otherwise never fire).
- Performance: interpolation is one tree walk per scan instead of one per
  element (was O(n²)); expression identifier extraction is cached; scope
  teardown is O(1) per scope; loop stores drop a layer of proxy indirection.
- Text nodes directly under the mount root are now interpolated.

### Fixed

- Assigning to a `computed` (or a ref's non-`value` property) no longer throws a
  cryptic strict-mode `TypeError`; it warns and is ignored.
- `[model]` on nested paths of ref-wrapped objects (`user.name`) now propagates
  to all other bindings (`setDeep` ends with a real trigger).
- Ref detection is brand-based (`isRef`) everywhere — plain objects with a
  `value` property are no longer silently unwrapped.
- `[class]` no longer clobbers classes added by third-party scripts.
- `[if]` subtrees no longer accumulate duplicate bindings/listeners across toggles.
- Keyed `data-for` no longer crashes when removing a duplicate-key row.
- `$`-prefixed identifiers (e.g. `$event`) are correctly recognised in expressions.

### Changed (breaking vs. the unpublished 1.x)

- `mount` requires an explicit store — no `window` default.
- `@event` handlers are full expressions with `$event`/`$el` in scope; the
  bespoke `fn(arg, …)` parser (with its event-as-last-argument convention) is gone.
- `HS-TOGGLE`/`HS-SEGMENT`/`HS-SELECT` support removed from core — register
  equivalents with `registerModelAdapter`.
- `model:prop` directive and `defineEmits` removed with the component layer.

See [docs/migration.md](docs/migration.md) for details.
