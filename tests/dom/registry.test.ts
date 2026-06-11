// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref, registerDirective, effect } from "../../src/index.js";
import { evalInScope } from "../../src/dom/expression.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("registerDirective", () => {
    test("validates its arguments", () => {
        expect(() => registerDirective("", () => {})).toThrow(TypeError);
        expect(() => registerDirective("[bad]", () => {})).toThrow(TypeError);
        expect(() => registerDirective("ok", "not-a-function" as any)).toThrow(TypeError);
    });

    test("custom directives work in both syntaxes and are reactive", async () => {
        registerDirective("upper", (el, expr, store) => {
            effect(() => {
                const v = evalInScope(expr, store);
                el.textContent = String(v ?? "").toUpperCase();
            });
        });

        const word = ref("quiet");
        const { container, cleanup } = mountHTML(
            '<span [upper]="word"></span><b data-upper="word"></b>',
            { word }
        );

        await flush();
        expect(container.querySelector("span")!.textContent).toBe("QUIET");
        expect(container.querySelector("b")!.textContent).toBe("QUIET");

        word.value = "loud";
        await flush();
        expect(container.querySelector("span")!.textContent).toBe("LOUD");

        cleanup();
    });

    test("custom directive effects are owned by the mount scope", async () => {
        registerDirective("traced", (el, expr, store) => {
            effect(() => {
                el.textContent = String(evalInScope(expr, store));
            });
        });

        const n = ref(1);
        const { container, app } = mountHTML('<i [traced]="n"></i>', { n });

        await flush();
        expect(container.querySelector("i")!.textContent).toBe("1");

        app.stop();
        n.value = 2;
        await flush();

        expect(container.querySelector("i")!.textContent).toBe("1");

        container.remove();
    });
});
