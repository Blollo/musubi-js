// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { ref, computed } from "../../src/index.js";
import { mountHTML, flush } from "../helpers/dom.js";

describe("integration", () => {
    test("computed + [if] + interpolation", async () => {
        const users = ref([
            { name: "Alice", age: 25 },
            { name: "Bob", age: 30 }
        ]);
        const firstUser = computed(() => users.value[0].name);
        const isAlice = computed(() => firstUser.value === "Alice");

        const { container, cleanup } = mountHTML(
            '<div [if]="isAlice">Hello {firstUser}!</div>',
            { isAlice, firstUser }
        );

        await flush();
        expect(container.querySelector("div")).not.toBeNull();
        expect(container.textContent).toContain("Alice");

        users.value = [{ name: "Charlie", age: 35 }];
        await flush();

        expect(container.querySelector("div")).toBeNull();

        cleanup();
    });

    test("todo-style flow: model + for + computed + events", async () => {
        const todos = ref([{ id: 1, text: "first", done: false }]);
        const draft = ref("");
        const remaining = computed(() => todos.value.filter(t => !t.done).length);
        let nextId = 2;

        const add = () => {
            if (draft.value.trim()) {
                todos.value.push({ id: nextId++, text: draft.value, done: false });
                draft.value = "";
            }
        };

        const { container, cleanup } = mountHTML(
            `<input [model]="draft" />
             <button @click="add">add</button>
             <ul><li data-for="todo of todos" :key="todo.id">{todo.text}</li></ul>
             <span [text]="remaining"></span>`,
            { todos, draft, remaining, add }
        );

        await flush();
        expect(container.querySelectorAll("li").length).toBe(1);
        expect(container.querySelector("span")!.textContent).toBe("1");

        const inputEl = container.querySelector("input")!;
        inputEl.value = "second";
        inputEl.dispatchEvent(new window.Event("input", { bubbles: true }));

        container.querySelector("button")!.click();
        await flush();

        const lis = container.querySelectorAll("li");
        expect(lis.length).toBe(2);
        expect(lis[1].textContent).toBe("second");
        expect(container.querySelector("span")!.textContent).toBe("2");
        expect(inputEl.value).toBe(""); // draft cleared through [model]

        cleanup();
    });
});
