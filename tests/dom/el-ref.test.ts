// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("ref / [ref] (element refs)", () => {
    test("exposes the element on an existing store ref", async () => {
        const box = ref(null);
        const { container, cleanup } = mountHTML('<div [ref]="box">x</div>', { box });

        await flush();
        expect(box.value).toBe(container.querySelector("div"));

        cleanup();
    });

    test("creates the store entry when missing", async () => {
        const store: Record<string, any> = {};
        const { container, cleanup } = mountHTML('<p ref="para">x</p>', store);

        await flush();
        expect(store.para.value).toBe(container.querySelector("p"));

        cleanup();
    });
});
