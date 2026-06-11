// shared source normalization for data-for — turns the evaluated source
// (array or plain object) into a uniform entries array, and maps entries
// onto the template variables declared in the data-for expression.

import { isPlainObject } from "../../../shared/lang.js";
import type { Store } from "../../types.js";

export interface ForEntry {
    item?: any;
    key?: string;
    value?: any;
    index: number;
}

// returns { isObject, entries } where entries is an array of
// { item, index } (arrays) or { key, value, index } (objects) descriptors
export function normalizeEntries (source: any): { isObject: boolean; entries: ForEntry[] } {
    if (isPlainObject(source)) {
        return {
            isObject: true,
            entries: Object.keys(source).map((key, index) => ({
                key,
                value: source[key],
                index
            }))
        };
    }

    const arr: any[] = source || [];

    return {
        isObject: false,
        entries: arr.map((item, index) => ({ item, index }))
    };
}

export function buildScopedVars (
    entry: ForEntry,
    var1: string,
    var2: string | undefined,
    var3: string | undefined,
    isObject: boolean
): Store {
    const vars: Store = {};

    if (isObject) {
        // object iteration:
        //   1 var  → entry pair [key, value]
        //   2 vars → (key, value)
        //   3 vars → (key, value, index)
        if (!var2 && !var3) {
            vars[var1] = [entry.key, entry.value];
        }
        else {
            vars[var1] = entry.key;

            if (var2) {
                vars[var2] = entry.value;
            }

            if (var3) {
                vars[var3] = entry.index;
            }
        }
    }
    else {
        // array iteration:
        //   1 var  → item
        //   2 vars → (item, index)
        //   3rd var is silently ignored for arrays
        vars[var1] = entry.item;

        if (var2) {
            vars[var2] = entry.index;
        }
    }

    return vars;
}
