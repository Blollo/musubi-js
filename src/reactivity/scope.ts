// ── effect scope ──────────────────────────────────────────────────────────────
//
// an EffectScope is an owner that collects every effect created inside it.
// calling scope.stop() stops them all in one shot, including child scopes.
// this is the mechanism that prevents detached dom nodes from being kept alive
// by effects that belong to removed loop iterations or hidden conditional branches.
//

/** anything with a stop() method — effects, scopes, dispose callbacks */
export interface Disposable {
    stop (): void;
}

export class EffectScope {
    effects: Disposable[] = [];
    children: EffectScope[] = [];
    stopped = false;
    parent: EffectScope | null;

    // our slot in parent.children, so detaching on stop() is O(1) (swap-pop) —
    // tearing down N sibling scopes one by one (an unkeyed data-for re-render)
    // must not cost O(N²)
    private parentIndex = -1;

    constructor (parent: EffectScope | null = null) {
        this.parent = parent;

        if (parent) {
            this.parentIndex = parent.children.push(this) - 1;
        }
    }

    add (eff: Disposable): void {
        this.effects.push(eff);
    }

    stop (fromParent = false): void {
        if (this.stopped) {
            return;
        }

        this.stopped = true;

        for (const eff of this.effects) {
            eff.stop();
        }

        for (const child of this.children) {
            child.stop(true);
        }

        this.effects  = [];
        this.children = [];

        // detach from the parent so repeatedly created-and-stopped child scopes
        // (e.g. an [if] branch toggling) don't accumulate in parent.children.
        // skipped when the parent itself is stopping — it clears its own list.
        if (!fromParent && this.parent) {
            const siblings = this.parent.children;
            const last = siblings.pop()!;

            if (last !== this) {
                siblings[this.parentIndex] = last;
                last.parentIndex = this.parentIndex;
            }
        }

        this.parent = null;
    }
}

// the currently active scope — every effect() call registers itself here
let activeScope: EffectScope | null = null;

/** Create an effect scope (a bulk-stop owner for effects). */
export function effectScope (parent?: EffectScope | null): EffectScope {
    return new EffectScope(parent ?? activeScope);
}

/** Run fn with the given scope active; effects created inside register with it. */
export function runInScope<T> (scope: EffectScope, fn: () => T): T {
    const prev = activeScope;
    activeScope = scope;

    try {
        return fn();
    }
    finally {
        activeScope = prev;
    }
}

export function getActiveScope (): EffectScope | null {
    return activeScope;
}

// register an effect (anything with a stop() method) with the currently
// active scope so it can be bulk-stopped later. internal — used by effect().
export function recordEffect (eff: Disposable): void {
    if (activeScope && !activeScope.stopped) {
        activeScope.add(eff);
    }
}

/**
 * Register a cleanup callback with the currently active scope.
 * When the scope is stopped the callback is invoked automatically.
 * This lets composable helpers hook into the teardown lifecycle.
 */
export function onScopeDispose (fn: () => void): void {
    if (activeScope && !activeScope.stopped) {
        activeScope.add({ stop: fn });
    }
}
