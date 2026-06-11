import { defineConfig } from "vitest/config";

export default defineConfig({
    // dev server doubles as the examples playground:
    // `npm run dev` opens a gallery of plain html pages that import the
    // library source directly — the same way real consumers use it
    server: {
        open: "/examples/"
    },

    build: {
        sourcemap: true,
        lib: {
            entry: "src/index.ts",
            name: "NaruReactive",
            formats: ["es", "iife"],
            fileName: format => (
                format === "es"
                    ? "naru-reactive.js"
                    : "naru-reactive.iife.min.js"
            )
        }
    },

    test: {
        // node by default; dom test files opt into jsdom with a
        // `// @vitest-environment jsdom` docblock — this keeps the
        // reactivity suite honest about being dom-free
        environment: "node",
        coverage: {
            provider: "v8",
            include: ["src/**"]
        }
    }
});
