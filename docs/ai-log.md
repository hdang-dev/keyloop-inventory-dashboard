# AI collaboration log

One entry per delivery phase: what the AI was asked to do, what was kept or changed, and how it was verified.

## Phase 0 – Project setup

- Asked AI to: check the brief against the design and plan, then scaffold Vite, React, strict TypeScript, Tailwind, shadcn/ui, ESLint, Prettier, Vitest and CI.
- Accepted: the planned stack. Generated shadcn components are kept close to upstream.
- Changed / rejected and why: the shadcn CLI generated a broken `from "cn"` import, which was corrected to `@/lib/utils`, and its unused `next-themes` dependency was removed. TypeScript is pinned to 5.9 because `typescript-eslint` does not support 7 yet. The design gained response shapes, a maintainability note and an explicit "no authentication" assumption, which the brief's checklist exposed as gaps.
- How verified: lint, typecheck, tests and build locally and in CI.
