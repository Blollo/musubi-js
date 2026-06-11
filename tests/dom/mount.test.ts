// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { ref, mount, scanBindings } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("mount", () => {
    test("requires a dom root", () => {
        expect(() => mount(null as any, {})).toThrow(TypeError);
        expect(() => mount("not-a-node" as any, {})).toThrow(TypeError);
    });

    test("requires an explicit store (no window default)", () => {
        const div = document.createElement("div");
        expect(() => (mount as any)(div)).toThrow(/store/i);
        expect(() => mount(div, null as any)).toThrow(/store/i);
    });

    test("stop() freezes all bindings", async () => {
        const count = ref(0);
        const { container, app } = mountHTML('<span [text]="count"></span>', { count });

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("0");

        count.value = 1;
        await flush();
        expect(container.querySelector("span")!.textContent).toBe("1");

        app.stop();
        count.value = 2;
        await flush();

        expect(container.querySelector("span")!.textContent).toBe("1");

        container.remove();
    });

    test("stop() restores data-for templates to their original markup", async () => {
        const items = ref(["a", "b"]);
        const { container, app } = mountHTML(
            '<ul><li data-for="item of items">{item}</li></ul>',
            { items }
        );

        await flush();
        expect(container.querySelectorAll("li").length).toBe(2);

        app.stop();

        // rendered rows removed, template element back in place
        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(1);
        expect(lis[0].hasAttribute("data-for")).toBe(true);

        container.remove();
    });

    test("stop() restores hidden [if] elements", async () => {
        const visible = ref(false);
        const { container, app } = mountHTML('<p [if]="visible">x</p>', { visible });

        await flush();
        expect(container.querySelector("p")).toBeNull();

        app.stop();
        expect(container.querySelector("p")).not.toBeNull();

        container.remove();
    });

    test("independent mounts don't interfere", async () => {
        const a = ref("a");
        const b = ref("b");

        const { container: containerA, cleanup: cleanupA } = mountHTML('<span [text]="value"></span>', { value: a });
        const { container: containerB, cleanup: cleanupB } = mountHTML('<span [text]="value"></span>', { value: b });

        await flush();
        expect(containerA.querySelector("span")!.textContent).toBe("a");
        expect(containerB.querySelector("span")!.textContent).toBe("b");

        cleanupA();

        b.value = "b2";
        await flush();
        expect(containerB.querySelector("span")!.textContent).toBe("b2");

        cleanupB();
    });

    test("the same tree can be re-mounted after stop, with a different store", async () => {
        const container = document.createElement("div");
        container.innerHTML = '<span [text]="msg"></span>';
        document.body.appendChild(container);

        const first = mount(container, { msg: ref("first") });
        await flush();
        expect(container.querySelector("span")!.textContent).toBe("first");

        first.stop();

        const second = mount(container, { msg: ref("second") });
        await flush();
        expect(container.querySelector("span")!.textContent).toBe("second");

        second.stop();
        container.remove();
    });

    test("root's own attributes are not scanned (descendants only)", async () => {
        const count = ref(1);
        const wrapper = document.createElement("div");
        wrapper.innerHTML = '<div [text]="count"><span>static</span></div>';
        document.body.appendChild(wrapper);

        const root = wrapper.firstElementChild!;
        const app = mount(root, { count });
        await flush();

        expect(root.textContent).toBe("static");

        app.stop();
        wrapper.remove();
    });
});

describe("scanBindings (deprecated alias)", () => {
    test("warns once and still binds", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const count = ref(3);
        const div = document.createElement("div");
        div.innerHTML = '<span [text]="count"></span>';
        document.body.appendChild(div);

        scanBindings(div, { count });
        await flush();

        expect(div.querySelector("span")!.textContent).toBe("3");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("deprecated"));

        // re-scanning the same subtree is a no-op (legacy shared-state semantics)
        const before = warn.mock.calls.length;
        scanBindings(div, { count });
        expect(warn.mock.calls.length).toBe(before); // warned only once

        warn.mockRestore();
        div.remove();
    });
});
