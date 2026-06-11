import { describe, test, expect, vi } from "vitest";
import { createEventBus, on, off, emit, once } from "../../src/index.js";

describe("createEventBus", () => {
    test("on + emit delivers payloads to handlers", () => {
        const bus = createEventBus();
        const received: string[] = [];

        bus.on("greet", (name, punctuation) => {
            received.push(name + punctuation);
        });

        bus.emit("greet", "world", "!");
        expect(received).toEqual(["world!"]);
    });

    test("multiple handlers all fire in registration order", () => {
        const bus = createEventBus();
        const order: string[] = [];

        bus.on("e", () => order.push("first"));
        bus.on("e", () => order.push("second"));
        bus.emit("e");

        expect(order).toEqual(["first", "second"]);
    });

    test("off removes a specific handler", () => {
        const bus = createEventBus();
        let calls = 0;
        const handler = () => calls++;

        bus.on("e", handler);
        bus.emit("e");
        bus.off("e", handler);
        bus.emit("e");

        expect(calls).toBe(1);
    });

    test("off on an unknown event is a no-op", () => {
        const bus = createEventBus();
        expect(() => bus.off("nope", () => {})).not.toThrow();
    });

    test("emit with no handlers is a no-op", () => {
        const bus = createEventBus();
        expect(() => bus.emit("nothing", 1, 2)).not.toThrow();
    });

    test("once fires a single time", () => {
        const bus = createEventBus();
        let calls = 0;

        bus.once("e", () => calls++);
        bus.emit("e");
        bus.emit("e");

        expect(calls).toBe(1);
    });

    test("a throwing handler doesn't silence the others", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const bus = createEventBus();
        let secondRan = false;

        bus.on("e", () => {
            throw new Error("boom");
        });
        bus.on("e", () => {
            secondRan = true;
        });

        expect(() => bus.emit("e")).not.toThrow();
        expect(secondRan).toBe(true);
        expect(error).toHaveBeenCalled();

        error.mockRestore();
    });

    test("buses are isolated from each other", () => {
        const a = createEventBus();
        const b = createEventBus();
        let aCalls = 0;

        a.on("shared-name", () => aCalls++);
        b.emit("shared-name");

        expect(aCalls).toBe(0);
    });
});

describe("default bus", () => {
    test("module-level on/emit/off work as a shared bus", () => {
        let calls = 0;
        const handler = () => calls++;

        on("default-bus-test", handler);
        emit("default-bus-test");
        off("default-bus-test", handler);
        emit("default-bus-test");

        expect(calls).toBe(1);
    });

    test("module-level once works", () => {
        let calls = 0;

        once("default-once-test", () => calls++);
        emit("default-once-test");
        emit("default-once-test");

        expect(calls).toBe(1);
    });
});
