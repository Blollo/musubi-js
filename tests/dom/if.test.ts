// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref, computed } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[if]", () => {
    test("shows when true", async () => {
        const visible = ref(true);
        const { container, cleanup } = mountHTML('<p [if]="visible">Visible</p>', { visible });

        await flush();
        expect(container.querySelector("p")).not.toBeNull();

        cleanup();
    });

    test("hides when false", async () => {
        const visible = ref(false);
        const { container, cleanup } = mountHTML('<p [if]="visible">Hidden</p>', { visible });

        await flush();
        expect(container.querySelector("p")).toBeNull();

        cleanup();
    });

    test("toggles visibility", async () => {
        const visible = ref(false);
        const { container, cleanup } = mountHTML('<p [if]="visible">Toggle</p>', { visible });

        await flush();
        expect(container.querySelector("p")).toBeNull();

        visible.value = true;
        await flush();
        expect(container.querySelector("p")).not.toBeNull();

        visible.value = false;
        await flush();
        expect(container.querySelector("p")).toBeNull();

        cleanup();
    });

    test("works with computed", async () => {
        const count = ref(0);
        const isPositive = computed(() => count.value > 0);
        const { container, cleanup } = mountHTML('<p [if]="isPositive">Positive</p>', { isPositive });

        await flush();
        expect(container.querySelector("p")).toBeNull();

        count.value = 5;
        await flush();
        expect(container.querySelector("p")).not.toBeNull();

        cleanup();
    });

    test("subtree bindings work and update across toggles", async () => {
        const visible = ref(true);
        const msg = ref("hello");
        const { container, cleanup } = mountHTML(
            '<div [if]="visible"><span [text]="msg"></span><p>{msg}</p></div>',
            { visible, msg }
        );

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("hello");
        expect(container.querySelector("p")!.textContent).toBe("hello");

        visible.value = false;
        await flush();
        expect(container.querySelector("span")).toBeNull();

        msg.value = "changed while hidden";
        visible.value = true;
        await flush();

        expect(container.querySelector("span")!.textContent).toBe("changed while hidden");
        expect(container.querySelector("p")!.textContent).toBe("changed while hidden");

        cleanup();
    });

    test("toggling does not duplicate event listeners (regression)", async () => {
        const visible = ref(true);
        let clicks = 0;
        const onClick = () => clicks++;

        const { container, cleanup } = mountHTML(
            '<div [if]="visible"><button @click="onClick">go</button></div>',
            { visible, onClick }
        );

        await flush();

        // toggle a few times — each show must re-bind exactly one listener
        visible.value = false;
        await flush();
        visible.value = true;
        await flush();
        visible.value = false;
        await flush();
        visible.value = true;
        await flush();

        container.querySelector("button")!.click();
        expect(clicks).toBe(1);

        cleanup();
    });

    test("initially-hidden subtrees are not bound against the outer scope (regression)", async () => {
        const visible = ref(false);
        let clicks = 0;
        const onClick = () => clicks++;

        const { container, cleanup } = mountHTML(
            '<div [if]="visible"><button @click="onClick">go</button></div>',
            { visible, onClick }
        );

        await flush();

        visible.value = true;
        await flush();

        container.querySelector("button")!.click();
        expect(clicks).toBe(1); // exactly one listener — not two

        cleanup();
    });

    test("nested [if] works", async () => {
        const outer = ref(true);
        const inner = ref(false);

        const { container, cleanup } = mountHTML(
            '<div [if]="outer"><p [if]="inner">deep</p></div>',
            { outer, inner }
        );

        await flush();
        expect(container.querySelector("p")).toBeNull();

        inner.value = true;
        await flush();
        expect(container.querySelector("p")).not.toBeNull();

        outer.value = false;
        await flush();
        expect(container.querySelector("div")).toBeNull();

        cleanup();
    });
});
