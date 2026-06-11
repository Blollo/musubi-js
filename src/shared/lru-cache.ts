// bounded lru cache.
// a plain Map is sufficient because Map preserves insertion order,
// letting us evict the least-recently-used entry when the cap is reached.

export class LRUCache<K, V> {
    private capacity: number;
    private map = new Map<K, V>();

    constructor (capacity: number) {
        this.capacity = capacity;
    }

    get size (): number {
        return this.map.size;
    }

    has (key: K): boolean {
        return this.map.has(key);
    }

    get (key: K): V | undefined {
        if (!this.map.has(key)) {
            return undefined;
        }

        // move to end to mark as most-recently-used
        const value = this.map.get(key)!;
        this.map.delete(key);
        this.map.set(key, value);

        return value;
    }

    set (key: K, value: V): void {
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        else if (this.map.size >= this.capacity) {
            // evict the least-recently-used entry (first key in insertion order)
            this.map.delete(this.map.keys().next().value!);
        }

        this.map.set(key, value);
    }
}
