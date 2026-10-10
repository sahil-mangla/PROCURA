# Procurement UI design mockups

Throwaway comparison of three design directions for the Request Detail page (spec section 12).
All three render the same mock data from `src/data/mock-request.ts`. Nothing here is the production app.

    npm install
    npm run dev        # then open the printed URL; / links to all three

| Route | Direction | Memorable moment |
|---|---|---|
| /ledger | Ledger: dense, ledger-green paper, ObsidianUI dashboard shell | Decision stamps the page, row slides into history |
| /trace | Trace: AI lane and people lane | Lanes split when a person overrides the AI (GSAP) |
| /docket | Docket: paper objects, hold-to-confirm | Decision receipt prints out of a slot |

Try Reject with a reason in each page to see how the AI/human disagreement is shown. "Reset demo" starts over.

Libraries: Motion, GSAP, NumberFlow, AutoAnimate, Radix, Tailwind v4. Some components in `src/components/`
come from ObsidianUI (MIT, see `src/components/OBSIDIANUI-LICENSE.txt`).
The review state in `src/data/useReview.ts` is a local simulation; in the real app it comes from the backend.

## Backgrounds
Each page has a procedural backdrop (blurred mesh light, grain, texture) in `src/directions/Backdrop.tsx`.
To add real photography, drop `public/bg/<name>.jpg` in place; see `public/bg/README.md` for sizes and prompts.

Design decision record: ../docs/design-decision.md
