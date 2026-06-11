// template expression evaluator — the ONLY place in the library where
// new Function appears. expressions are compiled once and cached (LRU);
// store keys referenced by the expression are passed in as parameters,
// with refs unwrapped while dependency tracking is active.
//
// ⚠️  CSP: because of new Function, pages whose Content-Security-Policy lacks
// 'unsafe-eval' cannot run template expressions. this is a documented
// limitation (docs/limitations.md). isolating the evaluator here keeps it
// swappable for a CSP-safe interpreter later.

import { LRUCache } from "../shared/lru-cache.js";
import { unref } from "../reactivity/ref.js";
import type { Store } from "./types.js";

type CompiledExpression = (...values: any[]) => any;

const MAX_FN_CACHE_SIZE = 500;
const fnCache = new LRUCache<string, CompiledExpression>(MAX_FN_CACHE_SIZE);

// expression → extracted root identifiers. evaluation happens on every
// effect re-run (the hottest path in the library); the regex scan only
// depends on the expression text, so it must not be repeated each time.
const varsCache = new LRUCache<string, string[]>(MAX_FN_CACHE_SIZE);

// module-level constant — allocated once rather than inside every evalInScope call
const KEYWORDS = new Set([
    "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "export", "extends",
    "finally", "for", "function", "if", "import", "in", "instanceof",
    "let", "new", "return", "static", "super", "switch", "this", "throw",
    "try", "typeof", "var", "void", "while", "with", "yield",
    "true", "false", "null", "undefined", "NaN", "Infinity"
]);

// extract potential root-level variable names from the expression.
// the pattern alternation consumes string literals (single, double, and
// template quotes) so identifiers inside them are never captured.
// the negative lookbehind (?<![\w$.]) ensures property-access tails like
// the "name" in "user.name" are skipped — only the root "user" is
// captured — and that identifiers starting with $ (like $event) match
// from their first character (\b never matches before a "$").
const varPattern = /(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(?<![\w$.])([a-zA-Z_$][a-zA-Z0-9_$]*)(?![\w$])/g;

function extractVars (expr: string): string[] {
    let vars = varsCache.get(expr);

    if (vars) {
        return vars;
    }

    const potentialVars = new Set<string>();
    let match: RegExpExecArray | null;

    varPattern.lastIndex = 0;

    while ((match = varPattern.exec(expr)) !== null) {
        const varName = match[1];

        // match[1] is undefined when the alternation matched a string literal
        if (varName && !KEYWORDS.has(varName)) {
            potentialVars.add(varName);
        }
    }

    vars = Array.from(potentialVars);
    varsCache.set(expr, vars);

    return vars;
}

export function evalInScope (expr: string | null | undefined, store: Store): any {
    expr = (expr || "").trim();

    if (!expr) {
        return undefined;
    }

    try {
        // build list of expression identifiers that exist in store
        const keys: string[] = [];

        for (const varName of extractVars(expr)) {
            if (varName in store) {
                keys.push(varName);
            }
        }

        // get or create cached compiled function
        const cacheKey = keys.join(",") + ":" + expr;
        let fn = fnCache.get(cacheKey);

        if (!fn) {
            fn = new Function(...keys, `return (${expr});`) as CompiledExpression;
            fnCache.set(cacheKey, fn);
        }

        // build values array — unwrap refs while tracking is active
        // this allows effects to track dependencies through evalInScope
        const values = keys.map(key => unref(store[key]));

        return fn(...values);
    }
    catch (e) {
        console.error("[musubi] expression error:", expr, e);

        return undefined;
    }
}
