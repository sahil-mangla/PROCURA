# Design decision: procurement approval UI

Date: 2026-10-09
Status: **Decided: a mix of the three mockup directions. The mix is mocked up at `/mix`** (`mockups/src/directions/mix/Mix.tsx`). The three source directions remain at `/ledger`, `/trace`, `/docket`.
Audience: the project owner and whoever builds the production frontend (Next.js app, per `03-frontend-integration-agent.md`).

## 1. The decision

The request detail page and the app around it combine one idea from each mockup:

| Part of the product | Taken from | Why |
|---|---|---|
| App frame, navigation, everyday screens, page layout, tokens | **Ledger** | Densest and calmest, best for people who approve many requests a day, and it uses the most ready-made parts (ObsidianUI `DashboardShell`). |
| Approval history | **Trace** | The timeline with AI steps on one side and people on the other shows an AI and a human disagreeing better than a table. Rows open as floating cards, so the page never changes height. |
| Audit record after a decision | **Docket** | The printed decision receipt is a clear, memorable record of what the AI said and what the person decided. |

Not carried over: Trace's dark theme and village photo background, Docket's desk and paper theme, Docket's glossy colored choice buttons.

Mockups: `mockups/` (run `npm install && npm run dev`). Routes `/mix` (the decision), `/ledger`, `/trace`, `/docket`.

## 2. Rules that apply whatever the visual style

These came from the spec and from review of the mockups.

**Product rules**
- The AI is decision support, never the decision. Always show: recommendation, confidence, risk, reasons ("Why?"), evidence IDs, model version, and the line "Final approval remains subject to workflow."
- A human decision that differs from the AI is shown in three places: the history row, the audit panel, and the notification. Never hide the disagreement.
- No frontend-only workflow states. Statuses and notifications mirror backend events. The backend stays authoritative, and the UI says so ("The server checks your permission again").
- If the AI service is unavailable, say so and let the request continue through the standard workflow.

**Interaction rules**
1. Details open in an overlay (popover) and never push the page or timeline down.
2. A recorded decision shows a small toast (about 6.5 seconds, dismissible) with the same wording on every page. It does not take over the page.
3. Search dims non-matching rows. It never hides or moves them.
4. One signature motion moment per page. Everything else animates only in response to a click. `prefers-reduced-motion` is respected everywhere.
5. Hold-to-confirm for decisions: 1.1 seconds, release to cancel, Space or Enter also work. A short press must never commit.
6. Page headers reveal word by word on load.

**Copy rules**: sentence case, plain words, buttons name the action ("Record rejection", not "Submit"), errors say what happened and how to fix it.

**Accessibility rules already built into the mockups**
- Animated numbers expose the whole number to screen readers (`Pct`), not loose digits.
- Progress bars have names. Each page sets its own tab title. The nav marks the current page with `aria-current`.
- Animated text exposes its full text once (`WordByWord`, `Typewriter`, `SplitText`).

## 3. Stack

Next.js, TypeScript, REST. Tailwind v4, Radix primitives, shadcn conventions.

| Need | Library | Licence |
|---|---|---|
| Animation | `motion` 14 (import from `motion/react`; do not add `framer-motion`) | MIT |
| SVG path drawing | `gsap` 3.15 (only the lane-split glyph uses it) | Free for commercial use, not MIT |
| Animated numbers | `@number-flow/react` 0.6 | MIT |
| List add/remove | `@formkit/auto-animate` | MIT |
| Components | ObsidianUI (`src/components/ui`, `block`) and Rewamp UI (`src/components/rewamp`, adapted, MIT) | MIT |
| Hand-drawn highlight | `rough-notation` via Magic UI `Highlighter` (`frontend/src/components/motion/Highlighter.tsx`, adapted) | MIT |
| Icons | `lucide-react` | ISC |

Attribution is in each adapted file's header. Magic UI was reviewed in full; only `Highlighter` is used (the override mark on the receipt). The rest was left out because it animates continuously or is decorative, against interaction rule 4, or duplicates what the stack already has. The Animated Theme Toggler is worth revisiting if a dark theme is added. `OBSIDIANUI-LICENSE.txt` is kept in `mockups/src/components/`. The Rewamp CLI wrote demo wrappers, not reusable components, so each effect was extracted into a props-driven component.

## 4. Tokens

The production theme starts from Ledger. Trace and Docket tokens are kept in case a dark theme or a Docket-style surface is added later.

### 4.1 Base theme (Ledger), use this one

Fonts: Public Sans for everything. Tabular numbers (`.tnum`) for amounts, IDs, dates, percentages.
Radius: 0.25rem base. Cards and panels use `rounded-2xl`, the hero band `rounded-3xl`, controls are pills.

| Token | Value | Use |
|---|---|---|
| background | `#e6efe8` | page, ledger-green paper |
| foreground | `#14233b` | ink navy text |
| card / popover | `#f7fbf8` | panels (used at 85% opacity with a light blur) |
| primary / ring | `#2a4c9b` | stamp blue: approve, AI, focus |
| destructive | `#b3342b` | stamp red: reject, override |
| secondary | `#d5e3d9` | |
| muted | `#dbe8df` | |
| muted-foreground | `#4a5f63` | secondary text |
| accent | `#cfe0d4` | |
| border / input | `#b6cabb` | |
| ok | `#1f6b4a` | supporting reasons, done steps |
| warn | `#a14d00` | medium risk, concerns, human review banner (darkened from `#a8690f`, which was 4.29:1 on cards and failed AA for small text) |
| ai | `#2a4c9b` | AI voice |
| human | `#8f5a0a` in the mix (`#14233b` in plain Ledger) | person voice: timeline lane, icon chip, dots |

Panel recipe: `border border-border/70 bg-card/85 backdrop-blur-sm` with shadow `0 1px 0 rgb(255 255 255/.7) inset, 0 14px 30px -20px rgb(20 35 59/.35)`.
Backdrop: ledger-green with soft mesh light, faint ruled lines, grain, plus a pastel Soft Aurora (`#7fcfb2`, `#9fb8ee`, `#efe6a6`, intensity 0.55, normal blend, opacity 0.65).

### 4.2 Trace tokens (for the timeline and any future dark theme)

Fonts: Bricolage Grotesque (display), Instrument Sans (body). Radius 0.75rem.
Background `#1a2233`, foreground `#e7ecf5`, card `#222c42`, primary `#f3b94d`, destructive `#ff7a7a`, border `#3a4768`, muted-foreground `#a3afc6`, **ai `#a99bff` (violet)**, **human `#f3b94d` (amber)**, ok `#5fd3a0`.
Glass recipe: `border-white/10 bg-white/[0.06] backdrop-blur-xl`. Popover surface: `bg-[#0f1830]/95 backdrop-blur-2xl`.
Background used in the mockup: `public/bg/trace.webp` (rainy lantern village, cross-stitch pixel art) dimmed to 72%, a dark shade, then Soft Aurora (`#4fd1c5`, `#5b8cff`, `#b48cff`, intensity 0.6, screen blend).

### 4.3 Docket tokens (for the receipt and printer-style details)

Fonts: Bricolage Grotesque (display), Public Sans (body), system monospace for the receipt. Radius 0.375rem.
Desk `#d3dadf`, paper `#fdfdfb`, ink `#1f2a33`, primary `#2b5fbf`, destructive `#d1342a`, ok `#1f7a4d`, warn `#a8690f`, highlighter `#f4e04d`, thermal paper `#f9f9f5` to `#eeeee7`.

### 4.4 Lane colours and contrast (measured)

Computed with WCAG relative luminance on the real tokens. Colour-vision rows use the Machado 2009 simulation and CIELAB distance (ΔE, higher is more different).

| Pair | Contrast | Note |
|---|---|---|
| AI blue `#2a4c9b` on card `#f7fbf8` / page `#e6efe8` | 7.72 / 6.86 | passes AA |
| People amber `#8f5a0a` on card / page | 5.53 / 4.92 | passes AA |
| Warn `#a14d00` on card / page / own 12% tint | 5.62 / 5.00 / 4.73 | passes AA for small text |
| foreground on card | 15.08 | |
| muted-foreground on card / page | 6.47 / 5.75 | |
| ok `#1f6b4a`, destructive `#b3342b` on card | 6.17, 5.84 | |
| white on primary, on destructive | 8.06, 6.10 | |

AI blue vs people amber, ΔE: normal 96, protanopia 93, deuteranopia 99, tritanopia 60. Plum, teal, magenta and rust were measured and rejected (plum drops to 26 for protanopia, teal to 17 for tritanopia, rust sits too close to the destructive red).

Accepted trade-off: the people amber and the warn orange are in the same warm family (ΔE 16). They are never the only cue. Lane position (left or right), the bot or person icon, and the "AI" and "People" lane labels carry the meaning, and risk text always comes with an icon or label.

Not measured: contrast of the Trace dark theme and the Docket theme, text over the photo or mesh backgrounds, and focus ring contrast.

## 5. Shared building blocks (`mockups/src/directions/`, `mockups/src/components/rewamp/`)

| Piece | What it does | Production notes |
|---|---|---|
| `TopBar` + `MagneticPillNav` | Pill nav whose indicator follows the pointer | Mockup navigation only. In production the Ledger sidebar is the navigation. The pill could become in-page tabs. |
| `MorphSearchCapsule` + `search.ts` | Search that morphs from icon to input and filters rows | Production filtering must be server-side for large datasets (spec section 14). |
| `Toast` + `buildDecisionToast` | One place defines what a recorded decision says | Wording must match backend events. |
| `PillButton` | Pill with arrow chip | Primary actions. |
| `Pct` | Animated percentage, readable by screen readers | Use for every animated number. |
| `Backdrop` + `SoftAurora` | Mesh light, grain, optional photo, WebGL aurora | Falls back to CSS gradients without WebGL, one still frame under reduced motion. |
| `WordByWord`, `Typewriter`, `SplitText` | Text reveals | `WordByWord` for headers. `Typewriter` for AI explanation sentences. `SplitText` is installed but unused. |
| Trace `Row` | Timeline row with a floating details card | The history component to build. Rows open one at a time, Escape closes. |
| `Divergence` (compact) | Small glyph of the AI and human lanes splitting or joining | Used in the toast. The large version is no longer used. |
| Docket `Receipt` + `HoldToConfirm` | Printed decision receipt, press-and-hold key | Receipt feeds out over about 2.6 seconds, no stepping. |

## 6. What the mix still needs

The mix page now exists (`/mix`): Ledger shell, hero and rail; the Trace timeline in the light theme; the Docket receipt and hold key in the decision panel.

Built and checked in the mix:
- Timeline rows open as floating cards and never change page height. Search dims rows. Titles fit in the half-width lanes (time moved into the subtitle, risk chip left to the rail card).
- The pending row ("Needs your review", "Review now") scrolls to the decision panel and moves focus there.
- Hold-to-confirm has an alternative: a "Confirm without holding" button under it. A short press never commits.
- Decision toast and the printed receipt appear after a decision.
- Lane colours and warn colour chosen from measurements (section 4.4).

Still open:
1. **Undo window.** The mix drops "Undo for a few seconds" because it needs backend support (the workflow may have moved on). Decide whether the product wants it.
2. **Screens that do not exist in any mockup:** login, dashboards (requester, department head, finance, admin), request creation form, notifications list, PO view, AI analytics, admin screens, and the error states (loading, empty, 401, 403, validation, server error, AI unavailable, workflow conflict).
3. **Navigation.** The magnetic pill nav in the top bar only switches between mockups. In production the Ledger sidebar is the navigation.
4. **Contrast outside the mix.** See "Not measured" in section 4.4.
5. **Narrow screens.** The mix works at 390px (checked), but the lane layout collapses to one column there, so the left and right separation is lost and only the icon, color and label remain.

## 7. Assumptions about the API (to confirm with the backend owner)

The mockups read this shape from `mockups/src/data/mock-request.ts`. It is invented, not a contract:
- AI analysis: `recommendation`, `confidence`, `risk`, `reviewThreshold`, `humanReviewReason`, `modelVersion`, `analysedAt`, `reasons[{text, tone}]`, `evidence[{id, summary, amount, outcome, similarity}]`.
- History entries: `actor`, `role`, `action`, `at`, `comment`, `decision`.
- Workflow steps: `id`, `label`, `state`, `actor`, `at`.
- Budget: `departmentBudget`, `spent`, and the request amount.

`useReview.ts` simulates the review step in the browser. In production this state must come from the backend.

## 8. Verification so far

- 43 automated checks through the Playwright MCP server, all passing: tab titles, accessible names, popover open and close, page height unchanged while a row is open, search, toast appears and dismisses, hold-to-confirm by pointer and keyboard, "Confirm without holding", receipt present, focus moves to the decision panel, no horizontal overflow at 390px on all five pages, no console errors.
- Regression found and fixed while adding the mix: a fifth nav item made the pill nav about 410px wide and overflowed 390px screens. It now uses tighter padding under 420px and scrolls inside itself below that (checked at 360, 390 and 430).
- 61 fps on the pages with the aurora, measured on one machine only.
- Production build passes (`npm run build`).

## 9. Open decisions

1. Dark theme for the production app, yes or no. Without it, `trace.webp` stays unused.
2. Aurora background on every page, or only the landing and hero areas.
3. Animate section headings too, or only page headers.
4. Bring back the printer-panel keys (matte keys with status LEDs), tried and set aside.
5. The calmer lighthouse background (prompt in `mockups/public/bg/README.md`) instead of the village image.
6. Who owns the village image's licence. It is user-supplied artwork.
7. Whether the product wants an undo window after a decision (needs backend support).
