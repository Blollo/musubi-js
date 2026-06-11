// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe(":attr / data-attr-*", () => {
    test(":href binds and updates", async () => {
        const url = ref("https://example.com");
        const { container, cleanup } = mountHTML('<a :href="url">Link</a>', { url });

        await flush();
        const a = container.querySelector("a")!;
        expect(a.getAttribute("href")).toBe("https://example.com");

        url.value = "https://newurl.com";
        await flush();
        expect(a.getAttribute("href")).toBe("https://newurl.com");

        cleanup();
    });

    test("data-attr-id binds", async () => {
        const id = ref("item-1");
        const { container, cleanup } = mountHTML('<div data-attr-id="id">x</div>', { id });

        await flush();
        expect(container.querySelector("div")!.getAttribute("id")).toBe("item-1");

        cleanup();
    });

    test("the template attribute itself is consumed", async () => {
        const url = ref("/x");
        const { container, cleanup } = mountHTML('<a :href="url">x</a>', { url });

        await flush();
        expect(container.querySelector("a")!.hasAttribute(":href")).toBe(false);

        cleanup();
    });

    test("false, null, and undefined remove the attribute (boolean semantics)", async () => {
        const hidden = ref<boolean | null>(true);
        const { container, cleanup } = mountHTML('<div :hidden="hidden">x</div>', { hidden });

        await flush();
        const div = container.querySelector("div")!;
        expect(div.getAttribute("hidden")).toBe(""); // true → empty-value boolean attribute

        hidden.value = false;
        await flush();
        expect(div.hasAttribute("hidden")).toBe(false);

        hidden.value = null;
        await flush();
        expect(div.hasAttribute("hidden")).toBe(false);

        cleanup();
    });
});
