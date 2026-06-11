// naru-reactive — public entry point.
// everything not re-exported here is a private module; the package
// "exports" map enforces that at install time.

/* reactivity engine (dom-free — usable standalone) */
export { ref, isRef, unref, triggerRef } from "./reactivity/ref.js";
export type { Ref, ReadonlyRef } from "./reactivity/ref.js";
export { reactive, isReactive } from "./reactivity/reactive.js";
export { computed } from "./reactivity/computed.js";
export type { ComputedRef } from "./reactivity/computed.js";
export { watch } from "./reactivity/watch.js";
export type { WatchOptions, WatchCallback, WatchSource } from "./reactivity/watch.js";
export { effect } from "./reactivity/effect.js";
export type { EffectRunner, EffectOptions } from "./reactivity/effect.js";
export { effectScope, runInScope, onScopeDispose, EffectScope } from "./reactivity/scope.js";
export { nextTick } from "./reactivity/scheduler.js";

/* dom bindings */
export { mount, scanBindings } from "./dom/mount.js";
export { registerDirective } from "./dom/directives/registry.js";
export { registerModelAdapter } from "./dom/directives/model.js";
export type {
    Store,
    ScanContext,
    DirectiveBinder,
    ModelAdapter,
    ModelAdapterApi,
    MountHandle,
    MountOptions
} from "./dom/types.js";

/* event bus */
export { createEventBus, on, off, emit, once } from "./events/bus.js";
export type { EventBus, EventHandler } from "./events/bus.js";
