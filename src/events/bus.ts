// event bus — createEventBus() returns an isolated bus; the module also
// exports a shared default bus (on/off/emit/once) for app-wide events.
// unrelated widgets that need private channels should create their own bus
// instead of namespacing event names on the default one.

export type EventHandler = (...values: any[]) => void;

export interface EventBus {
    on (eventName: string, handler: EventHandler): void;
    off (eventName: string, handler: EventHandler): void;
    emit (eventName: string, ...values: any[]): void;
    once (eventName: string, handler: EventHandler): void;
}

/** Create an isolated event bus. */
export function createEventBus (): EventBus {
    const events: Record<string, EventHandler[]> = {};

    function on (eventName: string, handler: EventHandler): void {
        (events[eventName] ||= []).push(handler);
    }

    function off (eventName: string, handler: EventHandler): void {
        if (!events[eventName]) {
            return;
        }

        events[eventName] = events[eventName].filter(fn => fn !== handler);

        if (events[eventName].length === 0) {
            delete events[eventName];
        }
    }

    function emit (eventName: string, ...values: any[]): void {
        // snapshot so handlers that unsubscribe (e.g. once) don't skip others
        for (const fn of [...(events[eventName] || [])]) {
            // isolate failures: one throwing handler must not silence the
            // rest, nor blow up at the emit site
            try {
                fn(...values);
            }
            catch (e) {
                console.error(`[musubi] event handler error for "${eventName}":`, e);
            }
        }
    }

    function once (eventName: string, handler: EventHandler): void {
        const wrapped: EventHandler = (...values) => {
            off(eventName, wrapped);
            handler(...values);
        };

        on(eventName, wrapped);
    }

    return { on, off, emit, once };
}

// shared default bus — convenient for page-level wiring on MPA sites
const defaultBus = createEventBus();

export const on   = defaultBus.on;
export const off  = defaultBus.off;
export const emit = defaultBus.emit;
export const once = defaultBus.once;
