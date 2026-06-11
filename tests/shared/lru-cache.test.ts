import { describe, test, expect } from "vitest";
import { LRUCache } from "../../src/shared/lru-cache.js";

describe("LRUCache", () => {
    test("stores and retrieves values", () => {
        const cache = new LRUCache(3);
        cache.set("a", 1);

        expect(cache.get("a")).toBe(1);
        expect(cache.get("missing")).toBeUndefined();
    });

    test("evicts the least-recently-used entry at capacity", () => {
        const cache = new LRUCache(2);
        cache.set("a", 1);
        cache.set("b", 2);
        cache.set("c", 3); // evicts "a"

        expect(cache.has("a")).toBe(false);
        expect(cache.get("b")).toBe(2);
        expect(cache.get("c")).toBe(3);
    });

    test("get refreshes recency", () => {
        const cache = new LRUCache(2);
        cache.set("a", 1);
        cache.set("b", 2);

        cache.get("a");      // "a" is now most-recently-used
        cache.set("c", 3);   // evicts "b", not "a"

        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(false);
    });

    test("set on an existing key updates without evicting", () => {
        const cache = new LRUCache(2);
        cache.set("a", 1);
        cache.set("b", 2);
        cache.set("a", 10);

        expect(cache.size).toBe(2);
        expect(cache.get("a")).toBe(10);
        expect(cache.get("b")).toBe(2);
    });
});
