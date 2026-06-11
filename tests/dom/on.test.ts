// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("@event / data-on*", () => {
    test("@click with a bare function name calls it with the event", async () => {
        let receivedEvent: Event | null = null;
        const handleClick = (e: Event) => {
            receivedEvent = e;
        };

        const { container, cleanup } = mountHTML('<button @click="handleClick">x</button>', { handleClick });

        await flush();
        container.querySelector("button")!.click();

        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent!.type).toBe("click");

        cleanup();
    });

    test("data-onclick binding works", async () => {
        const count = ref(0);
        const increment = () => count.value++;

        const { container, cleanup } = mountHTML('<button data-onclick="increment">+</button>', { increment, count });

        await flush();
        container.querySelector("button")!.click();

        expect(count.value).toBe(1);

        cleanup();
    });

    test("call expressions with arguments", async () => {
        let receivedArg: string | null = null;
        const handleClick = (arg: string) => {
            receivedArg = arg;
        };

        const { container, cleanup } = mountHTML(
            "<button @click=\"handleClick('test')\">x</button>",
            { handleClick }
        );

        await flush();
        container.querySelector("button")!.click();

        expect(receivedArg).toBe("test");

        cleanup();
    });

    test("$event is available in handler expressions", async () => {
        let receivedType: string | null = null;
        const handle = (e: Event) => {
            receivedType = e.type;
        };

        const { container, cleanup } = mountHTML(
            '<button @click="handle($event)">x</button>',
            { handle }
        );

        await flush();
        container.querySelector("button")!.click();

        expect(receivedType).toBe("click");

        cleanup();
    });

    test("arbitrary expressions work (no bespoke parser)", async () => {
        const items = ref(["a"]);

        const { container, cleanup } = mountHTML(
            "<button @click=\"items.push('b')\">x</button><span [text]=\"items.length\"></span>",
            { items }
        );

        await flush();
        container.querySelector("button")!.click();
        await flush();

        expect(items.value.length).toBe(2);
        expect(container.querySelector("span")!.textContent).toBe("2");

        cleanup();
    });

    test("method calls on store objects work (old parser ignored them)", async () => {
        let called = false;
        const actions = {
            save () {
                called = true;
            }
        };

        const { container, cleanup } = mountHTML('<button @click="actions.save()">x</button>', { actions });

        await flush();
        container.querySelector("button")!.click();

        expect(called).toBe(true);

        cleanup();
    });

    test("listeners are removed when the mount is stopped", async () => {
        let calls = 0;
        const handler = () => calls++;

        const { container, app } = mountHTML('<button @click="handler">x</button>', { handler });

        await flush();
        const button = container.querySelector("button")!;

        button.click();
        expect(calls).toBe(1);

        app.stop();
        button.click();
        expect(calls).toBe(1);

        container.remove();
    });
});
