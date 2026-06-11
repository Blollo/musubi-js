// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { ref, reactive } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("data-for (unkeyed)", () => {
    test("renders a list", async () => {
        const items = ref(["Apple", "Banana", "Cherry"]);
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items">{item}</li></ul>',
            { items }
        );

        await flush();
        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(3);
        expect(lis[0].textContent).toBe("Apple");
        expect(lis[2].textContent).toBe("Cherry");

        cleanup();
    });

    test("updates on array change", async () => {
        const items = ref(["A", "B"]);
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items">{item}</li></ul>',
            { items }
        );

        await flush();
        expect(container.querySelectorAll("li").length).toBe(2);

        items.value.push("C");
        await flush();
        expect(container.querySelectorAll("li").length).toBe(3);

        cleanup();
    });

    test("(item, index) syntax", async () => {
        const items = ref(["X", "Y"]);
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="(item, index) of items">{index}: {item}</li></ul>',
            { items }
        );

        await flush();
        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(2);
        expect(lis[0].textContent).toBe("0: X");
        expect(lis[1].textContent).toBe("1: Y");

        cleanup();
    });

    test("iterates plain objects with (key, value) syntax", async () => {
        const obj = ref({ a: 1, b: 2 });
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="(key, value) of obj">{key}={value}</li></ul>',
            { obj }
        );

        await flush();
        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(2);
        expect(lis[0].textContent).toBe("a=1");
        expect(lis[1].textContent).toBe("b=2");

        cleanup();
    });

    test("reactive-object iteration re-renders when keys are added or removed (regression)", async () => {
        const obj = reactive<Record<string, number>>({ a: 1 });
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="(key, value) of obj">{key}={value}</li></ul>',
            { obj }
        );

        await flush();
        expect(container.querySelectorAll("li").length).toBe(1);

        obj.b = 2; // brand-new key — Object.keys changes
        await flush();

        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(2);
        expect(lis[1].textContent).toBe("b=2");

        delete obj.a;
        await flush();
        expect(container.querySelectorAll("li").length).toBe(1);

        cleanup();
    });

    test("[if] on the same element as data-for warns instead of crashing (regression)", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const items = ref(["a", "b"]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" [if]="item !== \'a\'">{item}</li></ul>',
            { items }
        );

        await flush();

        // rows render ([if] is ignored on loop templates), nothing throws
        expect(container.querySelectorAll("li").length).toBe(2);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("[if]"));

        warn.mockRestore();
        cleanup();
    });

    test("loop variables shadow store keys; parent store stays reachable", async () => {
        const items = ref(["inner"]);
        const label = ref("outer");
        const { container, cleanup } = mountHTML(
            '<ul><li data-for="label of items">{label}/{items.length}</li></ul>',
            { items, label }
        );

        await flush();
        expect(container.querySelector("li")!.textContent).toBe("inner/1");

        cleanup();
    });

    test("invalid expressions are reported, not thrown", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        const { cleanup } = mountHTML('<ul><li data-for="not a loop">x</li></ul>', {});

        await flush();
        expect(error).toHaveBeenCalled();

        error.mockRestore();
        cleanup();
    });
});

describe("data-for (keyed)", () => {
    test("renders and re-renders by key", async () => {
        const items = ref([
            { id: 1, label: "one" },
            { id: 2, label: "two" }
        ]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" :key="item.id">{item.label}</li></ul>',
            { items }
        );

        await flush();
        let lis = container.querySelectorAll("li");
        expect(lis.length).toBe(2);
        expect(lis[0].textContent).toBe("one");

        items.value = [
            { id: 1, label: "one" },
            { id: 2, label: "two" },
            { id: 3, label: "three" }
        ];
        await flush();

        lis = container.querySelectorAll("li");
        expect(lis.length).toBe(3);
        expect(lis[2].textContent).toBe("three");

        cleanup();
    });

    test("reuses dom nodes for retained keys (identity check)", async () => {
        const items = ref([
            { id: "a", label: "A" },
            { id: "b", label: "B" }
        ]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" :key="item.id">{item.label}</li></ul>',
            { items }
        );

        await flush();
        const [nodeA, nodeB] = container.querySelectorAll("li");

        // reverse the order — nodes must move, not be recreated
        items.value = [
            { id: "b", label: "B" },
            { id: "a", label: "A" }
        ];
        await flush();

        const lis = container.querySelectorAll("li");
        expect(lis[0]).toBe(nodeB);
        expect(lis[1]).toBe(nodeA);

        cleanup();
    });

    test("updates retained rows in place when their data changes", async () => {
        const items = ref([{ id: 1, label: "before" }]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" :key="item.id">{item.label}</li></ul>',
            { items }
        );

        await flush();
        const node = container.querySelector("li")!;

        items.value = [{ id: 1, label: "after" }];
        await flush();

        expect(container.querySelector("li")).toBe(node); // same node
        expect(node.textContent).toBe("after");

        cleanup();
    });

    test("removes rows whose keys disappear", async () => {
        const items = ref([
            { id: 1, label: "one" },
            { id: 2, label: "two" }
        ]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" :key="item.id">{item.label}</li></ul>',
            { items }
        );

        await flush();
        expect(container.querySelectorAll("li").length).toBe(2);

        items.value = [{ id: 2, label: "two" }];
        await flush();

        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(1);
        expect(lis[0].textContent).toBe("two");

        cleanup();
    });

    test("duplicate keys warn and keep a single row", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const items = ref([
            { id: 1, label: "first" },
            { id: 1, label: "second" }
        ]);

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items" :key="item.id">{item.label}</li></ul>',
            { items }
        );

        await flush();

        expect(warn).toHaveBeenCalledWith(expect.stringContaining("duplicate :key"));
        expect(container.querySelectorAll("li").length).toBe(1);

        warn.mockRestore();
        cleanup();
    });
});

describe("data-for (nesting and integration)", () => {
    test("nested loops with scoped variables", async () => {
        const groups = ref([
            { name: "g1", members: ["a", "b"] },
            { name: "g2", members: ["c"] }
        ]);

        const { container, cleanup } = mountHTML(
            `<div data-for="group of groups">
                <span data-for="m of group.members">{group.name}:{m};</span>
             </div>`,
            { groups }
        );

        await flush();
        expect(container.textContent.replace(/\s+/g, "")).toBe("g1:a;g1:b;g2:c;");

        cleanup();
    });

    test("bindings inside rows work ([text], @click)", async () => {
        const items = ref(["x"]);
        let clicked: string | null = null;
        const pick = (item: string) => {
            clicked = item;
        };

        const { container, cleanup } = mountHTML(
            '<ul><li data-for="item of items"><button @click="pick(item)" [text]="item"></button></li></ul>',
            { items, pick }
        );

        await flush();
        const button = container.querySelector("button")!;
        expect(button.textContent).toBe("x");

        button.click();
        expect(clicked).toBe("x");

        cleanup();
    });
});
