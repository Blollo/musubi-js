// tiny leaf utilities — imported by anyone, importing no one.

export function isPlainObject (val: unknown): val is Record<PropertyKey, unknown> {
    return (
        val !== null
        && typeof val === "object"
        && !Array.isArray(val)
        && !(val instanceof Date)
        && !(val instanceof RegExp)
        && !(val instanceof Map)
        && !(val instanceof Set)
    );
}
