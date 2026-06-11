// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref, registerModelAdapter, effect } from "../../src/index.js";
import { listen } from "../../src/dom/directives/model.js";
import { mountHTML, flush } from "../helpers/dom.js";

function input (el: HTMLInputElement | HTMLSelectElement, value: string, eventName = "input") {
    el.value = value;
    el.dispatchEvent(new window.Event(eventName, { bubbles: true }));
}

describe("[model]", () => {
    test("text input: store → element", async () => {
        const text = ref("initial");
        const { container, cleanup } = mountHTML('<input type="text" [model]="text" />', { text });

        await flush();
        const el = container.querySelector("input")!;
        expect(el.value).toBe("initial");

        text.value = "updated";
        await flush();
        expect(el.value).toBe("updated");

        cleanup();
    });

    test("text input: element → store", async () => {
        const text = ref("");
        const { container, cleanup } = mountHTML('<input type="text" [model]="text" />', { text });

        await flush();
        input(container.querySelector("input")!, "typed");

        expect(text.value).toBe("typed");

        cleanup();
    });

    test("number input coerces to number", async () => {
        const amount = ref(0);
        const { container, cleanup } = mountHTML('<input type="number" [model]="amount" />', { amount });

        await flush();
        input(container.querySelector("input")!, "42");

        expect(amount.value).toBe(42);

        cleanup();
    });

    test("numeric input: in-progress entries like '05' are not clobbered (caret guard)", async () => {
        const amount = ref(0);
        const { container, cleanup } = mountHTML('<input type="number" [model]="amount" />', { amount });

        await flush();
        const el = container.querySelector("input")!;

        // user types "05" — store coerces to 5; the writeback effect must not
        // rewrite the field to "5" while it still reads as the same number
        input(el, "05");
        await flush();

        expect(amount.value).toBe(5);
        expect(el.value).toBe("05");

        // a genuine store change still updates the field
        amount.value = 12;
        await flush();
        expect(el.value).toBe("12");

        cleanup();
    });

    test("checkbox: both directions", async () => {
        const checked = ref(false);
        const { container, cleanup } = mountHTML('<input type="checkbox" [model]="checked" />', { checked });

        await flush();
        const el = container.querySelector("input")!;
        expect(el.checked).toBe(false);

        checked.value = true;
        await flush();
        expect(el.checked).toBe(true);

        el.checked = false;
        el.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(checked.value).toBe(false);

        cleanup();
    });

    test("radio group: both directions", async () => {
        const picked = ref("b");
        const { container, cleanup } = mountHTML(
            `<input type="radio" name="g" value="a" [model]="picked" />
             <input type="radio" name="g" value="b" [model]="picked" />`,
            { picked }
        );

        await flush();
        const [a, b] = container.querySelectorAll("input");
        expect(a.checked).toBe(false);
        expect(b.checked).toBe(true);

        a.checked = true;
        a.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(picked.value).toBe("a");

        cleanup();
    });

    test("select: both directions", async () => {
        const choice = ref("two");
        const { container, cleanup } = mountHTML(
            `<select [model]="choice">
                <option value="one">1</option>
                <option value="two">2</option>
             </select>`,
            { choice }
        );

        await flush();
        const el = container.querySelector("select")!;
        expect(el.value).toBe("two");

        input(el, "one", "change");
        expect(choice.value).toBe("one");

        cleanup();
    });

    test("nested path on a ref-wrapped object propagates to other bindings (regression)", async () => {
        const user = ref({ name: "before" });
        const { container, cleanup } = mountHTML(
            '<input type="text" [model]="user.name" /><span [text]="user.name"></span>',
            { user }
        );

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("before");

        input(container.querySelector("input")!, "after");
        await flush();

        // the old setDeep ended with a self-assignment that the ref's
        // identity check suppressed — the span stayed stale
        expect(container.querySelector("span")!.textContent).toBe("after");

        cleanup();
    });
});

describe("registerModelAdapter", () => {
    test("custom adapters take precedence for matching elements", async () => {
        // simulate a custom element with a value/change contract (what the
        // removed HS-* hardcoding used to cover, now in userland)
        registerModelAdapter(
            el => el.tagName === "X-TOGGLE",
            (el, { get, set }) => {
                effect(() => {
                    (el as any).toggleState = !!get();
                });
                listen(el, "x-change", e => set((e as CustomEvent).detail));
            }
        );

        const active = ref(true);
        const { container, cleanup } = mountHTML("<x-toggle [model]='active'></x-toggle>", { active });

        await flush();
        const el = container.querySelector("x-toggle") as any;
        expect(el.toggleState).toBe(true);

        el.dispatchEvent(new window.CustomEvent("x-change", { detail: false }));
        expect(active.value).toBe(false);

        cleanup();
    });

    test("validates its arguments", () => {
        expect(() => registerModelAdapter("nope" as any, () => {})).toThrow(TypeError);
        expect(() => registerModelAdapter(() => true, "nope" as any)).toThrow(TypeError);
    });
});
