# AI collaboration log

One entry per delivery phase: what the AI was asked to do, what was kept or changed, and how it was verified.

## Phase 0 – Project setup

- Asked AI to: check the brief against the design and plan, then scaffold Vite, React, strict TypeScript, Tailwind, shadcn/ui, ESLint, Prettier, Vitest and CI.
- Accepted: the planned stack. Generated shadcn components are kept close to upstream.
- Changed / rejected and why: the shadcn CLI generated a broken `from "cn"` import, which was corrected to `@/lib/utils`, and its unused `next-themes` dependency was removed. TypeScript is pinned to 5.9 because `typescript-eslint` does not support 7 yet. The design gained response shapes, a maintainability note and an explicit "no authentication" assumption, which the brief's checklist exposed as gaps.
- How verified: lint, typecheck, tests and build locally and in CI.

## Phase 1 – Domain and mock API

- Asked AI to: implement the domain types, the aging calculation, the MSW mock of every endpoint in the contract, and a typed API client.
- Accepted: the handler check order and `{ error: { code, message } }` shape from the plan; calendar-date comparison for days in stock.
- Changed / rejected and why: the mock database re-reads localStorage on every call, because caching it would make the planned two-tab 409 demo impossible. `?mockError=500` alone is consumed by the first request on page load, so `&mockErrorOn=PUT` was added to demonstrate a failed save. Stocking dates are relative to the current date so the demo keeps its spread of ages.
- How verified: unit tests for the day 90/91 boundary, local midnight in two time zones and both daylight-saving days; handler tests through the real client for filters, sorting, paging and 400/404/409.

## Phase 2 – Inventory list (R1)

- Asked AI to: build the dealership picker, summary cards, filter bar and server-side table, with all state in the URL.
- Accepted: TanStack Query and Table, a small URL-state helper instead of a router for this single page, and native selects for filters.
- Changed / rejected and why: TanStack Table v9 changed its API, so the code uses v8. Invalid URL values fall back to defaults rather than triggering a 400 error page. An impossible min/max range shows an inline message and is never sent. Automatic query retries are off because they would hide the error states and the demo error switch; a retry button and the 60-second poll handle recovery.
- How verified: tests through the real handlers for filters, URL sync, dependent model options, debounce, sorting, paging, back button and loading/empty/error states; a scripted Chromium run against the real service worker at desktop and phone widths with no console errors.

## Phase 3 – Aging stock (R2)

- Asked AI to: add the Aging tab, aging badge, highlighted summary card and dealership-time-zone dates.
- Accepted: the tab uses `agingOnly=true` and the UI only reads `isAging` from the API, so no aging rule exists in the browser.
- Changed / rejected and why: switching tab resets the sort, otherwise a sort chosen on All Stock would break the "oldest first" promise of the Aging tab. The badge sits in the days-in-stock cell rather than its own column, to keep the table narrow.
- How verified: tests for the request parameters, the badge at day 90 and day 91, URL restore and time-zone dates; visual check in Chromium.

## Phase 4 – Actions and history (R3)

- Asked AI to: build the side panel, the validated action form, history, and an optimistic save with rollback and 409 handling.
- Accepted: React Hook Form with Zod, optimistic updates to both the table and panel caches, and rollback from a snapshot.
- Changed / rejected and why: refetch on focus would give the second tab the new version as soon as it was focused, so the planned two-tab conflict could never fire. An edited form now keeps the version the user started from, while an untouched form follows the latest data. A test also exposed that a Radix dialog with no trigger sends focus to `<body>` on close, so focus now returns to the row. Toasts live in the mutation so a failed save is still reported if the panel was closed meanwhile.
- How verified: tests for save, optimistic display, validation, rollback, 409, refocus during an edit and persistence; a scripted Chromium run with two real tabs, an injected 500 and a reload.

### Phase 4 follow-up – broken `main`

- What happened: `@hookform/resolvers` 5.9 and 7 declare an optional `ajv@8` peer that conflicts with ESLint's `ajv@6`, which makes `npm ci` fail in CI though it passes locally. The AI then merged Phase 4 with CI red, because a retry command did not make the merge conditional on the checks. `main` was broken until this fix.
- Fix: pinned `@hookform/resolvers` to 5.2.2, which has no such peer, and merged only after CI passed.
- How verified: clean `npm ci`, the local suite, and a green CI run on the pull request and on `main`.

## Phase 5 – Quality and observability

- Asked AI to: add the error boundary, structured logger, `X-Request-Id`, web-vitals logging and an accessibility pass.
- Accepted: one replaceable log sink as the Sentry integration point; API failures logged at `warn` with the request id, since they are expected and handled.
- Changed / rejected and why: a scripted axe audit flagged the summary cards' `dl` markup because card wrappers sat between `dl` and `dt`, so it was replaced with plain elements. A skip link was added. The app now still renders if the mock fails to start, so its error states can explain the problem.
- How verified: unit tests for the logger, client and error boundary; axe (WCAG 2.1 A/AA and best practices) clean on the page and the open panel; a scripted keyboard-only run from the skip link through to saving an action and focus returning to the row; request ids confirmed present and unique on every API call; no console errors.
- Follow-up to the Phase 4 incident: the CI failure was also a timing assumption in one test, because the error toast renders a tick before the table rollback. The test now waits for the rollback, and would still fail if it never happened.
