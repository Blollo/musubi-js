// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[show]", () => {
    test("displays when true", async () => {
        const visible = ref(true);
        const { container, cleanup } = mountHTML('<p [show]="visible">Shown</p>', { visible });

        await flush();
        expect(container.querySelector("p")!.style.display).not.toBe("none");

        cleanup();
    });

    test("hides when false", async () => {
        const visible = ref(false);
        const { container, cleanup } = mountHTML('<p [show]="visible">Hidden</p>', { visible });

        await flush();
        expect(container.querySelector("p")!.style.display).toBe("none");

        cleanup();
    });

    test("toggles display and keeps the element in the dom", async () => {
        const visible = ref(true);
        const { container, cleanup } = mountHTML('<p [show]="visible">Toggle</p>', { visible });

        await flush();
        const p = container.querySelector("p")!;
        expect(p.style.display).not.toBe("none");

        visible.value = false;
        await flush();
        expect(p.style.display).toBe("none");
        expect(container.querySelector("p")).toBe(p); // still in the dom

        visible.value = true;
        await flush();
        expect(p.style.display).not.toBe("none");

        cleanup();
    });

    test("restores the element's own inline display value", async () => {
        const visible = ref(false);
        const { container, cleanup } = mountHTML(
            '<p style="display: flex" [show]="visible">x</p>',
            { visible }
        );

        await flush();
        const p = container.querySelector("p")!;
        expect(p.style.display).toBe("none");

        visible.value = true;
        await flush();
        expect(p.style.display).toBe("flex");

        cleanup();
    });
});
