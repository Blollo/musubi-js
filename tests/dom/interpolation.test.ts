// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("{curly} interpolation", () => {
    test("renders and updates", async () => {
        const count = ref(42);
        const { container, cleanup } = mountHTML("<p>Count: {count}</p>", { count });

        await flush();
        expect(container.textContent).toContain("42");

        count.value = 99;
        await flush();
        expect(container.textContent).toContain("99");

        cleanup();
    });

    test("multiple values in one text node", async () => {
        const first = ref("John");
        const last = ref("Doe");
        const { container, cleanup } = mountHTML("<p>{first} {last}</p>", { first, last });

        await flush();
        expect(container.textContent).toContain("John Doe");

        first.value = "Jane";
        await flush();
        expect(container.textContent).toContain("Jane Doe");

        cleanup();
    });

    test("expressions work", async () => {
        const count = ref(5);
        const { container, cleanup } = mountHTML("<p>{count * 2}</p>", { count });

        await flush();
        expect(container.textContent).toContain("10");

        cleanup();
    });

    test("text directly under the mount root is interpolated", async () => {
        const name = ref("root-level");
        const { container, cleanup } = mountHTML("hello {name}", { name });

        await flush();
        expect(container.textContent).toBe("hello root-level");

        name.value = "still live";
        await flush();
        expect(container.textContent).toBe("hello still live");

        cleanup();
    });

    test("static text around expressions is preserved", async () => {
        const name = ref("naru");
        const { container, cleanup } = mountHTML("<p>before {name} after</p>", { name });

        await flush();
        expect(container.querySelector("p")!.textContent).toBe("before naru after");

        cleanup();
    });

    test("script and style content is left alone", async () => {
        const { container, cleanup } = mountHTML(
            "<style>.a { color: red }</style><p>{msg}</p>",
            { msg: ref("hi") }
        );

        await flush();
        expect(container.querySelector("style")!.textContent).toBe(".a { color: red }");
        expect(container.querySelector("p")!.textContent).toBe("hi");

        cleanup();
    });
});
