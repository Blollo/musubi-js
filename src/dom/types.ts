// shared types of the dom layer — the public contracts that mount(),
// the directive registry, and the model-adapter system expose.

import type { EffectRunner } from "../reactivity/effect.js";

/** the object template expressions are evaluated against */
export type Store = Record<string, any>;

/** a rendered {interpolation} text node and the effect that keeps it fresh */
export interface BoundTextRecord {
    expr: string;
    runner: EffectRunner;
}

/**
 * Per-mount scan state, threaded through the recursive parts of the
 * pipeline — [if] re-scans, data-for row creation — without module-level
 * globals. Passed to every directive binder as the fourth argument.
 */
export interface ScanContext {
    scanned: WeakSet<Element>;
    boundText: WeakMap<Text, BoundTextRecord>;
    scan (root: ParentNode, store: Store): void;
    bindElement (el: Element, store: Store): void;
    interpolate (root: ParentNode, store: Store): void;
    unmarkTree (root: ParentNode): void;
}

export type DirectiveBinder = (
    el: Element,
    expression: string,
    store: Store,
    ctx: ScanContext
) => void;

export interface ModelAdapterApi {
    /** Evaluate the bound expression against the store. */
    get (): any;
    /** Write a value back into the store at the bound path. */
    set (value: any): void;
}

export type ModelAdapter = (el: Element, api: ModelAdapterApi) => void;

export interface MountHandle {
    /** Tear down: stop all effects, remove listeners, restore [if]/data-for placeholders. */
    stop (): void;
}

/** reserved for future options (e.g. a CSP-safe expression evaluator) */
export type MountOptions = Record<string, unknown>;
