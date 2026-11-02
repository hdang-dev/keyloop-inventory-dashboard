# Implementation Plan – Intelligent Inventory Dashboard (Keyloop Scenario B)

> Working plan for Claude Code. Build the **frontend only**; the backend is **mocked with MSW**.
> **`SYSTEM_DESIGN.md` is the source of truth** for business rules, assumptions, data model and API contract. Read it fully before writing code. If this plan and the design disagree, the design wins – ask the reviewer.

---

## 0. Working rules for Claude Code

1. **One phase at a time.** Each phase = one branch = one pull request.
2. **Branch:** `phase-<n>-<short-name>` from the latest `main`.
3. **At the end of a phase:**
   - run `npm run lint`, `npm run typecheck`, `npm test` – all must pass;
   - commit with Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`);
   - push and open a PR (`gh pr create`) with summary, changes, how to test, screenshots for UI;
   - **STOP and wait for review.** Do not start the next phase.
4. **Merge only after the reviewer says "OK"** (`gh pr merge --squash --delete-branch`), then pull `main` and start the next phase.
5. Review feedback → new commits on the same branch, reply with what changed, wait again.
6. **Do not invent business rules or features.** Anything not in `SYSTEM_DESIGN.md` or this plan → ask.
7. After each phase, append an entry to `docs/ai-log.md` (section 6).

---

## 1. What to read in SYSTEM_DESIGN.md

| Need | Section |
|---|---|
| Requirements and assumptions (aging rule, statuses, polling) | §2 |
| Components and what is mocked | §3 |
| Data flows per requirement | §4 |
| Entities and fields | §5 |
| API contract, error codes, save-action rules | §6 |
| Design decisions (paging, optimistic locking, optimistic UI) | §7 |
| Time zone rules | §7 (Time zones) |
| Tech stack | §8 |
| Frontend observability scope | §10 |

---

## 2. Mock backend (MSW) – implementation rules

- Folder `src/mocks/`: `data/seed.ts`, `db.ts`, `handlers.ts`, `browser.ts`, `server.ts` (for tests).
- Handlers implement **every endpoint in SYSTEM_DESIGN §6** with the same shapes and error codes.
- Seed: 2–3 dealerships, at least two different time zones (e.g. `Asia/Ho_Chi_Minh`, `Europe/London`); ~1,000 vehicles spread over 0–200 days in stock; Faker with a **fixed seed**.
- Aging and days-in-stock logic in `src/domain/aging.ts` – pure function `(stockedAt, timezone, now)`, following §7 (Time zones). Used by handlers only; the UI never recalculates.
- Filtering, sorting and paging happen in the handlers (simulating the server).
- Actions and history persisted in **localStorage**; vehicles come from the seed.
- `updatedBy` = fixed mock user ("Demo Manager").
- Simulated latency 200–600 ms.
- Demo error injection: `?mockError=500` on the app URL fails the next API call. Conflicts (409) are reproduced by saving the same vehicle from two tabs.
- MSW starts in dev/demo builds only. App code calls `/api/*` with plain `fetch`.

**API details (complete the contract in SYSTEM_DESIGN §6):**

- `GET /vehicles`: `sort` = `daysInStock:desc` (default) | `daysInStock:asc` | `make:asc|desc` | `model:asc|desc`; `page` default 1, `pageSize` default 20, max 100. Response `{ items, page, pageSize, total }`.
- `PUT /vehicles/{id}/action`: `version: 0` for the first action; `note` optional, max 500 chars. Checks in order:
  1. vehicle exists → else `404 NOT_FOUND`
  2. vehicle is aging → else `400 NOT_AGING`
  3. body valid → else `400 VALIDATION_ERROR`
  4. version matches → else `409 VERSION_CONFLICT` with the latest `currentAction` in the body
  5. save action (version + 1) and append history → `200` with the new `currentAction`
- `updatedBy` is set by the server, never taken from the request.

---

## 3. UI

- **Top bar:** title, dealership picker.
- **Summary cards:** Total vehicles, Aging vehicles (highlighted).
- **Tabs:** All Stock / Aging Stock (`agingOnly=true`, oldest first).
- **Filter bar:** make, model (depends on make), days-in-stock min/max, reset.
- **Table:** VIN, make, model, stocked date (dealership time zone), days in stock, aging badge, current status. Server-side paging and sorting.
- **Side panel on row click:** details, action form (aging vehicles only), history (newest first).
- Loading skeletons, empty states, error states with retry.
- Filters, tab, sort, page and selected vehicle in URL query params.
- TanStack Query: `refetchInterval: 60_000`, `refetchOnWindowFocus: true`.

---

## 4. Phases (one PR each)

### Phase 0 – Project setup
- Vite + React + TypeScript (strict), Tailwind, shadcn/ui, ESLint + Prettier, Vitest + RTL, path aliases.
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:watch`.
- GitHub Actions CI: lint, typecheck, test.
- Empty app shell, README skeleton, `docs/ai-log.md`.
- **Done when:** CI green, app runs.

### Phase 1 – Domain and mock API
- `src/domain/`: types and status list per §5, `aging.ts` per §7 (Time zones).
- MSW seed, db, all handlers per §6, localStorage persistence.
- Typed API client in `src/api/` with an error type carrying `code`.
- **Tests:** day 90 not aging, day 91 aging; local-midnight boundary in two time zones; a daylight-saving day; handler tests for filters, sort, paging, and 400/404/409.

### Phase 2 – Inventory list (R1)
- Dealership picker, summary cards, filter bar, table with server-side paging/sorting.
- Query hooks, URL-synced state, 300 ms debounce on number inputs, keep previous page while loading, polling.
- **Tests:** filters update URL and request params; model options depend on make; paging; loading/empty/error states.

### Phase 3 – Aging stock (R2)
- Aging tab, aging badge, highlighted summary card, dates shown in dealership time zone.
- **Tests:** Aging tab requests `agingOnly=true` sorted oldest first; badge only when `isAging`.

### Phase 4 – Actions and history (R3)
- Side panel with action form (React Hook Form + Zod) and history.
- Mutation with optimistic update; rollback + toast on error; submit disabled while pending.
- 409 → "Updated by someone else" message, panel refreshed with the latest action.
- **Tests:** save updates table and history; validation errors; rollback on 500; 409 handling; form hidden for non-aging vehicles.

### Phase 5 – Quality and observability
- Error boundary, `src/lib/logger.ts` (structured JSON, Sentry-ready), `X-Request-Id` header on API calls, web-vitals logging (per §10).
- Accessibility: labels, keyboard navigation on rows and panel, focus handling.
- **Done when:** no console errors; keyboard-only flow works.

### Phase 6 – Docs and polish
- README: overview, install, run, test, build, mock notes, structure, link to `SYSTEM_DESIGN.md`, **AI Collaboration Narrative** section.
- Finalize `docs/ai-log.md`.

---

## 5. Folder structure

```
src/
  api/            # typed fetch client + query keys
  components/     # shared UI (shadcn in components/ui)
  features/
    inventory/    # table, filters, summary, tabs
    vehicle/      # side panel, action form, history
  domain/         # types, action statuses, aging (pure, tested)
  hooks/
  lib/            # logger, URL state helpers, utils
  mocks/          # MSW seed, db, handlers, browser, server
  test/           # test setup, render helpers
docs/
  ai-log.md
SYSTEM_DESIGN.md
PLAN.md
```

---

## 6. AI collaboration log (`docs/ai-log.md`)

After each phase append:

```
## Phase <n> – <name>
- Asked AI to: ...
- Accepted: ...
- Changed / rejected and why: ...
- How verified: tests, manual check, review notes
```

---

## 7. Definition of done (every phase)

- [ ] Lint, typecheck and tests pass locally and in CI
- [ ] No `any`, no dead code, no console errors
- [ ] Matches `SYSTEM_DESIGN.md` (assumptions, contract, time zone rules)
- [ ] PR opened with summary and test steps
- [ ] `docs/ai-log.md` updated
- [ ] Waiting for reviewer "OK" before merging
