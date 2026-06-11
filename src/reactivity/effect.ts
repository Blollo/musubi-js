// reactive effect — the single tracking primitive everything else is built on.
// owns the active-effect stack and the dependency graph (track / trigger / cleanup).
// scheduling of async effects is delegated to scheduler.ts.

import { queueEffect, dequeueEffect } from "./scheduler.js";
import { recordEffect } from "./scope.js";

/** a set of effects subscribed to one reactive source */
export type Subscribers = Set<EffectRunner>;

export interface EffectOptions {
    /** Run synchronously on trigger instead of batching in a microtask. */
    sync?: boolean;
    /** Don't run on creation — the caller invokes the runner itself (internal, used by computed). */
    lazy?: boolean;
    /** Called on trigger instead of re-running the effect (internal, used by computed). */
    scheduler?: () => void;
}

/** the callable returned by effect() — re-runs the effect; carries its state */
export interface EffectRunner {
    (): unknown;
    deps: Subscribers[];
    stopped: boolean;
    sync: boolean;
    scheduler: (() => void) | null;
    /** Stop the effect: clears its subscriptions and prevents future runs. */
    stop (): void;
}

let activeEffect: EffectRunner | null = null;

// null entries are the untracked() sentinel — see below
const effectStack: (EffectRunner | null)[] = [];

// remove the effect from every subscriber set it appears in.
// called before each re-run so the dependency graph never holds
// stale subscriptions from a previous run (e.g. branches not taken anymore).
export function cleanup (effect: EffectRunner): void {
    if (!effect.deps) {
        return;
    }

    for (const dep of effect.deps) {
        dep.delete(effect);
    }

    effect.deps.length = 0;
}

export function track (subscribers: Subscribers): void {
    if (!activeEffect) {
        return;
    }

    if (!subscribers.has(activeEffect)) {
        subscribers.add(activeEffect);
        activeEffect.deps.push(subscribers);
    }
}

// guards the synchronous trigger cascade (sync effects and computed
// invalidations re-triggering each other) — without it, a mutual sync loop
// dies in a cryptic stack overflow long before any engine check. 100 nested
// triggers comfortably covers deep-but-finite computed chains while staying
// an order of magnitude below real stack limits.
const MAX_SYNC_TRIGGER_DEPTH = 100;
let syncTriggerDepth = 0;

export function trigger (subscribers: Subscribers | null | undefined): void {
    if (!subscribers || subscribers.size === 0) {
        return;
    }

    // snapshot — sync effects re-track during the loop and mutate the set
    const toRun = Array.from(subscribers);

    // run sync effects (and computed invalidation schedulers) immediately.
    // an effect never re-triggers itself: writing to your own dependency
    // (e.g. a clamping effect) is a steady state, not an infinite loop.
    syncTriggerDepth++;

    try {
        if (syncTriggerDepth > MAX_SYNC_TRIGGER_DEPTH) {
            throw new Error(
                `[musubi] Possible infinite synchronous reactive loop detected: ` +
                `trigger recursion exceeded ${MAX_SYNC_TRIGGER_DEPTH} levels ` +
                `(sync effects or computeds re-triggering each other).`
            );
        }

        for (const fn of toRun) {
            if (fn.stopped || fn === activeEffect) {
                continue;
            }

            if (fn.scheduler) {
                fn.scheduler();
            }
            else if (fn.sync) {
                fn();
            }
        }
    }
    finally {
        syncTriggerDepth--;
    }

    // queue async effects for batching
    for (const fn of toRun) {
        if (fn.stopped || fn === activeEffect || fn.scheduler || fn.sync) {
            continue;
        }

        queueEffect(fn);
    }
}

// run fn with dependency tracking disabled.
// pushes a null sentinel onto the effectStack so that if a nested sync
// effect() runs inside fn and then pops the stack, it restores activeEffect
// to null (our sentinel) rather than back to the outer effect — which would
// re-enable accidental tracking for any reads that follow the nested call.
export function untracked<T> (fn: () => T): T {
    effectStack.push(null);
    activeEffect = null;

    try {
        return fn();
    }
    finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1] || null;
    }
}

/** Run fn immediately and re-run it whenever its reactive dependencies change. */
export function effect (fn: () => unknown, options: EffectOptions = {}): EffectRunner {
    const wrapped = function wrappedEffect (): unknown {
        // don't run if stopped
        if (wrapped.stopped) {
            return undefined;
        }

        cleanup(wrapped);
        effectStack.push(wrapped);
        activeEffect = wrapped;

        try {
            return fn();
        }
        finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1] || null;
        }
    } as EffectRunner;

    wrapped.deps      = [];
    wrapped.stopped   = false;
    wrapped.sync      = options.sync || false;
    wrapped.scheduler = options.scheduler || null;

    // add a stop method to clean up and prevent future runs
    wrapped.stop = function (): void {
        if (!wrapped.stopped) {
            cleanup(wrapped);
            // remove from queue immediately so stopped effects don't linger until next flush
            dequeueEffect(wrapped);
            wrapped.stopped = true;
        }
    };

    // register with the active scope so it can be bulk-stopped later
    recordEffect(wrapped);

    if (!options.lazy) {
        wrapped();
    }

    return wrapped;
}
