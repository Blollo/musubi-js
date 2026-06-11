import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/", "node_modules/", "coverage/"]
    },

    // plain javascript (config files, examples helpers)
    {
        files: ["**/*.js"],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly"
            }
        }
    },

    // typescript — tseslint replaces no-undef & friends with type-aware checks
    {
        files: ["**/*.ts"],
        extends: [...tseslint.configs.recommended],
        rules: {
            // proxy traps, store plumbing, and the expression evaluator are
            // deliberately dynamic — `any` is a documented design choice there
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_" }]
        }
    },

    // house style for everything: 4-space indent, double quotes, space
    // before function parens — tuned to the existing codebase, deliberately
    // not Prettier (it would flatten the intentional alignment style)
    {
        files: ["**/*.{js,ts}"],
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "@stylistic/indent": ["error", 4, { SwitchCase: 1 }],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/space-before-function-paren": ["error", "always"],
            "@stylistic/brace-style": ["error", "stroustrup"],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/eol-last": "error",

            "prefer-const": "error",
            "no-var": "error",
            "eqeqeq": ["error", "smart"]
        }
    },

    // tests read reactive values without using them ("count.value;") to
    // establish dependency tracking on purpose
    {
        files: ["tests/**"],
        rules: {
            "@typescript-eslint/no-unused-expressions": "off"
        }
    },

    // layer boundary: the reactivity engine (and the other leaf layers)
    // must never know the dom layer exists — this is what makes the
    // engine usable standalone and testable in bare node
    {
        files: ["src/reactivity/**", "src/shared/**", "src/events/**"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    {
                        group: ["**/dom/**"],
                        message: "The reactivity/shared/events layers must not import from the dom layer."
                    }
                ]
            }]
        }
    }
);
