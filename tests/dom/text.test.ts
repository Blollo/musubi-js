// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[text]", () => {
    test("[text] directive renders and updates", async () => {
        const count = ref(0);
        const { container, cleanup } = mountHTML('<span [text]="count"></span>', { count });

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("0");

        count.value = 5;
        await flush();
        expect(container.querySelector("span")!.textContent).toBe("5");

        cleanup();
    });

    test("data-text directive renders and updates", async () => {
        const name = ref("Alice");
        const { container, cleanup } = mountHTML('<p data-text="name"></p>', { name });

        await flush();
        expect(container.querySelector("p")!.textContent).toBe("Alice");

        name.value = "Bob";
        await flush();
        expect(container.querySelector("p")!.textContent).toBe("Bob");

        cleanup();
    });

    test("null and undefined render as empty string", async () => {
        const value = ref(null);
        const { container, cleanup } = mountHTML('<span [text]="value"></span>', { value });

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("");

        cleanup();
    });

    test("expressions are supported", async () => {
        const count = ref(4);
        const { container, cleanup } = mountHTML("<span [text]=\"count * 2 + 'x'\"></span>", { count });

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("8x");

        cleanup();
    });
});
