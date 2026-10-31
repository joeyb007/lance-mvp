# CHANGES: feat/supervisor (worktree B)

## What I built (`src/features/supervisor/`)

| File | What |
|---|---|
| `SupervisorHome.tsx` | One scrolling page, export kept: Headline → Updates inbox → To assign (queue) → Team. "See queue" / decision rows scroll to the queue / that room's card. |
| `Headline.tsx` | Big number from `roomsNeedingAttention()`, plus a breakdown line: "1 can't be done in time · 1 to assign · 1 running late" (counts of `queue()` items by recommendation type + `lateRooms()`). |
| `Inbox.tsx` | `inbox()` in three always-present groups in fixed order: **Urgent** (red card, red dot per item, informational only, no buttons), **Needs a decision** (count, tappable rows → that room's card, "See queue ›"), **For your info** (muted card). An empty group shows a one-line "Nothing to decide." etc. so the order never shifts. |
| `AssignQueue.tsx` | `queue()` as-is (no re-sorting). Header "To assign N" + black **Assign all** (disabled when no item has a `pick`). Cards: RoomChip, `cleanLabel`, `item.label`, `arrivalBadge`. `pick` → "Best: Priya" + avatar + reason, **Give to Priya** (black pill, 52px) + **Choose someone else** (white pill). `no-one` → red block "{reason} Let the front desk know.", no button. `null` (blocked) → muted card, wrench, "Waiting on maintenance. Mark fixed under More → Maintenance tickets.", no buttons. Empty state card. |
| `WhoTakesSheet.tsx` | "Who takes {room}?": `options()` in selector order, avatar + name + `reason`. Feasible rows tap → `assign` + close; infeasible rows `disabled`, greyed, "Can't make it" pill. Recommended row gets a green "Best" pill (from `recommendation()`). Closes itself if the room leaves the queue. |
| `Team.tsx` | `projections()` per housekeeper: "Done by 12:40 · 20 min spare" / "Finishes 1:05 · 5 min over", rooms left, coloured by status. Bar = one segment per remaining room sized by its planned slot (from `roomsFor()`), window now → shift end; rooms past shift end are solid red, with a tick at shift end. Shows that Rosa's 4 rooms are more work than Maya's 5 without rating anyone. |
| `FrameSheet.tsx` | Local workaround, see below. |

All data comes from selectors; nothing in this folder ranks, recommends, orders or checks feasibility.

## Local workarounds for shared pieces

- **`FrameSheet` (portal for `BottomSheet`).** The shell renders `SupervisorHome` inside `<main className="relative overflow-y-auto">`. The shared `BottomSheet` is `absolute inset-0`, so rendered inside that main it anchors to the top of the *scrolled content*: opening it from 207's card (below the fold) would put the sheet off-screen. `FrameSheet` portals the shared `BottomSheet` into the phone frame (main's parent, where the shell's own sheet lives). Suggested shared fix: give `BottomSheet` a portal target, or drop `relative` from the shell's `<main>`. **The housekeeper Problem sheet likely has the same issue.**

No other shared pieces were missing. No edits outside `src/features/supervisor/` and this file.

## Deviations from the TDD

- Queue section is titled **"To assign"** (plainer than "Assignment queue"); test id is `queue`.
- Headline breakdown line is my addition (prompted by the brief); the counts add up to the headline.
- Empty inbox groups are shown with a one-line empty message rather than hidden, to keep the three-group structure stable.

## Verified

- `npm test`: 35/35. `npm run build`: passes. `oxlint` on the folder: clean.
- Throwaway Playwright run (390×844 @2x, `vite preview`, as Jordan; not committed):
  - Load: needing attention **3**; breakdown "1 can't be done in time · 1 to assign · 1 running late"; Urgent 2 = "106 can't be ready for the 11:00 arrival" + "Rosa on track to finish 1:05 / 107 at risk · shift ends 1:00"; queue 106 (no-one warning, no button) then 207 → "Best: Priya · On floor 2 · free 11:50 · done 12:10 · 50 min spare".
  - Choose someone else on 207: Maya disabled ("Would finish 1:03 · shift ends 1:00"), Priya enabled + Best, Rosa disabled ("Would finish 1:28 · shift ends 1:00").
  - Assign all: toast "1 room assigned · 207 → Priya · Undo"; needing attention **2**; queue only 106; Assign all disabled.
  - No buttons under 48px in the supervisor page, no horizontal overflow at 390px, no console errors.

## Known gaps

- **Not exercised in the browser:** the flagged-107 path (needs the housekeeper UI), the blocked "Waiting on maintenance" card, and a non-empty For your info group. They render from the same selector fields and type-check, but I haven't seen them on screen. Worth a look after the merge (TDD §3 step 3–4).
- Urgent items are informational only (rule 1 + TDD §12 deliberate cut), so there's no action on "Rosa on track to finish 1:05".
- "See queue" uses `scrollIntoView({ behavior: 'smooth' })`; fine in Chromium, not tested on iOS Safari.
