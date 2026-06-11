# Contributing

Thanks for your interest! This project aims to stay small, dependency-free at
runtime, and friendly to no-build-step consumers.

## Setup

```sh
git clone https://github.com/alessiogiusti/naru-reactive.git
cd naru-reactive
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server — opens the runnable examples gallery |
| `npm test` | full Vitest suite (engine tests run in Node, DOM tests in jsdom) |
| `npm run test:watch` | watch mode |
| `npm run test:coverage` | V8 coverage report |
| `npm run typecheck` | `tsc --noEmit` over src and tests (strict) |
| `npm run lint` | ESLint (style + layer-boundary rules) |
| `npm run build` | ESM + IIFE bundles + generated `.d.ts` into `dist/` |

## Architecture ground rules

- The source is TypeScript (strict). Keep types **strict at the public
  boundaries**; inside proxy traps and the expression evaluator, pragmatic
  `any` is a documented design choice — don't fight the type system there.
- `src/reactivity/`, `src/shared/`, `src/events/` **must not import from
  `src/dom/`** — the engine stays DOM-free (lint-enforced). Engine tests run
  in plain Node to prove it.
- `new Function` is allowed **only** in `src/dom/expression.ts`.
- The public API is exactly what `src/index.ts` re-exports; the published
  type definitions are generated from source at build time. New exports need
  a `docs/api/` entry.
- Match the house style (4-space indent, double quotes, `function (` spacing,
  aligned assignments where the neighbours do it). `npm run lint` enforces
  the mechanical parts.

## Pull requests

1. Add or update tests — bug fixes need a regression test that fails without
   the fix.
2. `npm test && npm run lint && npm run build` must pass.
3. Add a changeset for user-visible changes: `npm run changeset`.
4. Keep PRs focused; refactors and features in separate PRs review faster.

## Reporting bugs

Use the issue template. A minimal HTML snippet + store that reproduces the
problem (or a failing test) is worth a thousand words.
