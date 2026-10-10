# Procura frontend

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4, Radix. Visual design: the `/mix` mockup in `../mockups`, decided in `../docs/design-decision.md`.

## Run it

```bash
npm install
npm run dev:mock      # fake backend from ../contracts/openapi.yaml on :4010, app on :3000
```

Open <http://localhost:3000> and sign in with any email and password. The mock returns random data that fits the contract, so values change on every request and are often nonsense (dates in 1950, 246% budget use). That is expected: it shows the UI copes with anything the contract allows.

Against the real backend:

```bash
cp .env.example .env.local   # API_URL=http://localhost:8080/api
npm run dev
```

| Script | What it does |
|---|---|
| `dev:mock` | Mock backend plus dev server |
| `dev` | Dev server against `API_URL` |
| `gen:api` | Regenerates `src/lib/api/schema.d.ts` after a contract change |
| `typecheck`, `lint`, `build` | Checks to run before pushing |

## How it fits together

- **The backend is authoritative.** Pages show the buttons in `allowedActions` and the steps in `workflowSteps` from the API, and never work out the workflow themselves (contract decision D15).
- **The token never reaches the browser.** `login` stores the backend's JWT in an httpOnly cookie. All API calls run on the server (`src/lib/api/server.ts`), from Server Components and Server Actions.
- **Typed against the contract.** `schema.d.ts` is generated from `../contracts/openapi.yaml`. If the contract changes, run `gen:api` and fix whatever stops compiling.
- **Cache Components.** Anything that reads the session sits inside a Suspense boundary (`loading.tsx` per section, or `<Suspense>` around the user menu). Each section has its own layout that tells the shell which section it is in, so the frame prerenders as static HTML. Nothing user-specific is cached.

```text
src/
  app/
    login/                    sign in (Server Action)
    (app)/requests/           list, filter, search (server-side)
    (app)/requests/new/       create a request (save draft or submit)
    (app)/requests/[id]/      request detail: AI panel, timeline, decision panel
    (app)/requests/[id]/edit/ edit a DRAFT or INFO_REQUESTED request
    (app)/reviews/            finance review queue
  components/
    shell/                    ObsidianUI DashboardShell (MIT), AppShell, user menu
    review/                   DecisionPanel, Timeline, AiPanel, HoldToConfirm, Receipt, Toast
    request/                  RequestForm (create and edit)
    motion/                   WordByWord, Typewriter, Pct, SoftAurora (Rewamp UI, MIT)
    ledger.tsx                Section, Row, Stepper, StatusPill
  lib/
    api/                      generated schema, typed server client
    actions.ts                Server Actions: login, logout, decisions, submit, retry PO
    format.ts                 money, percentages, dates, labels
  proxy.ts                    sends signed-out visitors to /login
```

## Not built yet

Dashboards per role, notifications, purchase orders, budgets, AI analytics, admin screens. Design doc section 6 lists these.
