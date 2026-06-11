// effect scheduler — owns the async effect queue, the microtask flush,
// and the infinite-loop guard. effects themselves live in effect.ts;
// this module only knows how to run "runner" functions.

import type { EffectRunner } from "./effect.js";

const effectQueue = new Set<EffectRunner>();

let isFlushing     = false;
let isFlushPending = false;

const MAX_FLUSH_ITERATIONS = 100;

export function queueEffect (effect: EffectRunner): void {
    if (!effectQueue.has(effect)) {
        effectQueue.add(effect);

        if (!isFlushing && !isFlushPending) {
            isFlushPending = true;
            queueMicrotask(flushEffectQueue);
        }
    }
}

// remove a stopped effect from the queue immediately so it doesn't
// linger until the next flush
export function dequeueEffect (effect: EffectRunner): void {
    effectQueue.delete(effect);
}

function flushEffectQueue (): void {
    isFlushPending = false;
    isFlushing = true;

    let iterations = 0;

    try {
        while (effectQueue.size > 0) {
            if (++iterations > MAX_FLUSH_ITERATIONS) {
                effectQueue.clear();
                throw new Error(
                    `[musubi] Possible infinite reactive loop detected: ` +
                    `effect queue was still non-empty after ${MAX_FLUSH_ITERATIONS} flush iterations.`
                );
            }

            const effects = Array.from(effectQueue);
            effectQueue.clear();

            for (const fn of effects) {
                if (fn.stopped) {
                    continue;
                }

                // isolate failures: one throwing effect must not abort the
                // rest of the queue (or surface as an unhandled microtask
                // error that takes the whole page's bindings down with it)
                try {
                    fn();
                }
                catch (e) {
                    console.error("[musubi] effect error:", e);
                }
            }
        }
    }
    finally {
        isFlushing = false;
    }
}

// synchronously drain the effect queue. exposed mainly for tests and for
// advanced consumers that need the dom to be consistent before continuing.
export function flushSync (): void {
    if (isFlushing) {
        return;
    }

    if (effectQueue.size > 0) {
        flushEffectQueue();
    }
}

// resolves after the current batch of queued effects has flushed.
// the flush microtask (if any) was scheduled before this one, so by the
// time the returned promise resolves the dom and watchers are settled —
// cascading effects are drained inside a single flush pass.
export function nextTick (): Promise<void> {
    return new Promise(resolve => queueMicrotask(resolve));
}
