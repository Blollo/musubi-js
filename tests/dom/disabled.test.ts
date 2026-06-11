// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("[disabled]", () => {
    test("binds the disabled property reactively", async () => {
        const locked = ref(true);
        const { container, cleanup } = mountHTML('<button [disabled]="locked">go</button>', { locked });

        await flush();
        const button = container.querySelector("button")!;
        expect(button.disabled).toBe(true);

        locked.value = false;
        await flush();
        expect(button.disabled).toBe(false);

        cleanup();
    });

    test("coerces truthy expressions", async () => {
        const count = ref(0);
        const { container, cleanup } = mountHTML('<button [disabled]="count > 2">go</button>', { count });

        await flush();
        const button = container.querySelector("button")!;
        expect(button.disabled).toBe(false);

        count.value = 5;
        await flush();
        expect(button.disabled).toBe(true);

        cleanup();
    });
});
