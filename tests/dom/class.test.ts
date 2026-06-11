// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref, reactive } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[class]", () => {
    test("adds classes from a string", async () => {
        const classes = ref("active bold");
        const { container, cleanup } = mountHTML('<p [class]="classes">x</p>', { classes });

        await flush();
        const p = container.querySelector("p")!;
        expect(p.classList.contains("active")).toBe(true);
        expect(p.classList.contains("bold")).toBe(true);

        cleanup();
    });

    test("adds classes from an object of conditions", async () => {
        const state = reactive({ isActive: true, isError: false });
        const { container, cleanup } = mountHTML(
            '<p [class]="{ active: state.isActive, error: state.isError }">x</p>',
            { state }
        );

        await flush();
        const p = container.querySelector("p")!;
        expect(p.classList.contains("active")).toBe(true);
        expect(p.classList.contains("error")).toBe(false);

        state.isError = true;
        state.isActive = false;
        await flush();

        expect(p.classList.contains("active")).toBe(false);
        expect(p.classList.contains("error")).toBe(true);

        cleanup();
    });

    test("adds classes from an array", async () => {
        const classes = ref(["one", "two"]);
        const { container, cleanup } = mountHTML('<p [class]="classes">x</p>', { classes });

        await flush();
        const p = container.querySelector("p")!;
        expect(p.classList.contains("one")).toBe(true);
        expect(p.classList.contains("two")).toBe(true);

        cleanup();
    });

    test("static classes survive updates", async () => {
        const classes = ref("dynamic");
        const { container, cleanup } = mountHTML('<p class="static" [class]="classes">x</p>', { classes });

        await flush();
        const p = container.querySelector("p")!;

        classes.value = "other";
        await flush();

        expect(p.classList.contains("static")).toBe(true);
        expect(p.classList.contains("dynamic")).toBe(false);
        expect(p.classList.contains("other")).toBe(true);

        cleanup();
    });

    test("classes added by third-party scripts are not clobbered (regression)", async () => {
        const classes = ref("mine");
        const { container, cleanup } = mountHTML('<p [class]="classes">x</p>', { classes });

        await flush();
        const p = container.querySelector("p")!;

        // a third-party script decorates the element after binding
        p.classList.add("third-party");

        classes.value = "mine-updated";
        await flush();

        expect(p.classList.contains("third-party")).toBe(true);
        expect(p.classList.contains("mine")).toBe(false);
        expect(p.classList.contains("mine-updated")).toBe(true);

        cleanup();
    });
});
