// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[html]", () => {
    test("renders markup and updates", async () => {
        const markup = ref("<strong>bold</strong>");
        const { container, cleanup } = mountHTML('<div [html]="markup"></div>', { markup });

        await flush();
        expect(container.querySelector("strong")).not.toBeNull();
        expect(container.querySelector("strong")!.textContent).toBe("bold");

        markup.value = "<em>italic</em>";
        await flush();
        expect(container.querySelector("strong")).toBeNull();
        expect(container.querySelector("em")!.textContent).toBe("italic");

        cleanup();
    });

    test("null renders as empty", async () => {
        const markup = ref(null);
        const { container, cleanup } = mountHTML('<div [html]="markup"></div>', { markup });

        await flush();
        expect(container.querySelector("div")!.innerHTML).toBe("");

        cleanup();
    });
});
