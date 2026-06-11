import { describe, test, expect, vi } from "vitest";
import { reactive, isReactive, effect, nextTick } from "../../src/index.js";

describe("reactive", () => {
    test("creates reactive object", () => {
        const obj = reactive({ count: 0 });
        expect(obj.count).toBe(0);
    });

    test("nested properties are reactive", () => {
        const obj = reactive({
            nested: { value: 1 }
        });

        obj.nested.value = 2;
        expect(obj.nested.value).toBe(2);
    });

    test("triggers effect on property change", async () => {
        const obj = reactive({ count: 0 });
        let dummy;

        effect(() => {
            dummy = obj.count;
        });

        obj.count = 1;
        await nextTick();

        expect(dummy).toBe(1);
    });

    test("deep nested properties trigger effects", async () => {
        const obj = reactive({
            level1: {
                level2: {
                    value: "deep"
                }
            }
        });
        let dummy;

        effect(() => {
            dummy = obj.level1.level2.value;
        });

        obj.level1.level2.value = "changed";
        await nextTick();

        expect(dummy).toBe("changed");
    });

    test("returns same proxy for same object", () => {
        const obj = { count: 0 };
        const proxy1 = reactive(obj);
        const proxy2 = reactive(obj);
        expect(proxy1).toBe(proxy2);
    });

    test("reactive of a reactive returns the same proxy", () => {
        const proxy = reactive({ a: 1 });
        expect(reactive(proxy)).toBe(proxy);
    });

    test("array properties trigger on mutation", async () => {
        const state = reactive({ items: [1, 2] });
        let len;

        effect(() => {
            len = state.items.length;
        });

        state.items.push(3);
        await nextTick();

        expect(len).toBe(3);
    });

    test("key enumeration tracks additions and removals (ownKeys)", async () => {
        const obj = reactive<Record<string, number>>({ a: 1 });
        let keys;

        effect(() => {
            keys = Object.keys(obj);
        });

        expect(keys).toEqual(["a"]);

        obj.b = 2; // brand-new key
        await nextTick();
        expect(keys).toEqual(["a", "b"]);

        delete obj.a;
        await nextTick();
        expect(keys).toEqual(["b"]);
    });

    test("'in' checks participate in tracking (has)", async () => {
        const obj = reactive<Record<string, boolean>>({});
        let present;

        effect(() => {
            present = "flag" in obj;
        });

        expect(present).toBe(false);

        obj.flag = true;
        await nextTick();

        expect(present).toBe(true);
    });

    test("deleting a property triggers effects", async () => {
        const obj = reactive<Record<string, number>>({ a: 1 });
        let dummy;

        effect(() => {
            dummy = obj.a;
        });

        delete obj.a;
        await nextTick();

        expect(dummy).toBeUndefined();
    });

    test("non-object input warns and is returned as-is", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(reactive(null as any)).toBeNull();
        expect(reactive(5 as any)).toBe(5);
        expect(warn).toHaveBeenCalled();

        warn.mockRestore();
    });

    test("prototype pollution is blocked without throwing", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const obj = reactive({ a: 1 });

        expect(() => {
            (obj as any).__proto__ = { polluted: true };
        }).not.toThrow();

        expect(({} as any).polluted).toBeUndefined();
        warn.mockRestore();
    });
});

describe("isReactive", () => {
    test("detects reactive proxies", () => {
        expect(isReactive(reactive({}))).toBe(true);
        expect(isReactive({})).toBe(false);
        expect(isReactive(null)).toBe(false);
    });
});
