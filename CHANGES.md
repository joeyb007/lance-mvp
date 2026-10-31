# CHANGES

Per-branch notes from Phase 1, kept verbatim. Merge notes at the bottom.

---

## CHANGES: feat/housekeeper (worktree A)

## What I built (`src/features/housekeeper/`)

| File | What |
|---|---|
| `HousekeeperHome.tsx` | Same export and props. Summary line → "Assigned to you" (from `roomsFor`, never re-sorted) → Done today → Problem sheet. Empty state ("Your list is clear") when the list is empty. |
| `SummaryLine.tsx` | Coloured by `projections()[id].status`. Green or amber: "5 rooms left · done by 12:40 / Shift ends 1:00 · 20 min spare". Red: "On track to finish 1:05 · shift ends 1:00 / 4 rooms left · 5 min over". |
| `RoomCard.tsx` | RoomChip, `cleanLabel`, "Planned 10:30–10:50", tags, then a black **Start** (or **Done** while in progress) and a white **Problem** on every open card. The in-progress card gets a green border and a green banner, "In progress · since 10:30 · until 11:05" (styled after Lance's 06-in-progress). |
| `tags.ts` | Pure function `roomTags(plannedRoom, now, shiftEnd)`. It returns: Available at / From Jordan · available / From Jordan · ready now / From Jordan / Ready now / arrival badge (red when urgent) / Late for 11:00 arrival / Runs past 1:00. It only reads `PlannedRoom` fields and does no scheduling. |
| `tags.test.ts` | 3 Vitest cases: 305 shows "Available at 12:00"; 107 at load shows "Runs past 1:00"; Priya's 107 shows "From Jordan · available 11:30", then "From Jordan · ready now" after a skip. |
| `ProblemSheet.tsx` | Follows TDD §5 exactly. DND chips come from `dndChips()`, with the helper "Later = can't get back to it today · goes to Jordan". Broken chips: Light / Leak / AC/heat / TV / Other. Then a full-width "Guest declined service" button. All chips are 48px tall. Each tap dispatches `flag` and closes the sheet (2 taps total). |
| `DoneToday.tsx` | Compact, muted cards (from `doneFor`): chip, label, "✓ Done 10:50", plus a "done · simulated" tag when `room.simulated`. |

There is no toast in this folder: the reducer sets `state.toast` and the shell shows it.

## Local workarounds for shared pieces
- **BottomSheet portal.** `BottomSheet` is `absolute inset-0`. When rendered inside the shell's scrolling `<main>` (which is `relative`), it sticks to the top of the scrolled content and does not cover the visible screen. `ProblemSheet` therefore portals it into the phone frame (`main.parentElement`, found via a hidden anchor). Suggested follow-up: give the shell or `ui/` a proper sheet host or portal target.
- No missing selectors or actions. `src/domain`, `src/state`, `src/ui` and `src/features/shell` are untouched.

## Deviations / judgement calls
- **Start is disabled on a "waiting" room** (DND come-back time still in the future, e.g. 305 before 12:00), as well as while another room is in progress. The TDD doesn't say. The reducer would allow it and would clear `availableAt`, which looked like a way to accidentally knock on a DND door. Easy to revert: `disabled={busy}` in `RoomCard.tsx`.
- **"In progress · since 10:30" is the card's green banner, not a Pill**, so it isn't shown twice.
- **Toast copy is whatever the reducer sets.** For example, "107 sent to Jordan / Doesn't fit your day · Jordan will pick someone · Undo" and "305 moved to 12:00 / Still yours · Undo". The room-naming parts match TDD §3.

## Verified
- `npm test`: 38/38 (35 domain + 3 new). `npm run build`: OK.
- Playwright at 390×844 @2x against `vite preview` (throwaway script, not committed). Maya: 305 → DND 12:00 moves 305 to the end with "Available at 12:00" and the toast "305 moved to 12:00". Rosa is red ("On track to finish 1:05 · shift ends 1:00"). Rosa: 107 → 11:30 removes 107, toast "107 sent to Jordan", summary goes green "3 rooms left · done by 12:30". Start 101 shows the green banner, and 104's Start is disabled. Done 101 puts it under Done today. Priya after two skips: 206 in progress, 201–203 show "done · simulated". The sheet opened while scrolled to the bottom covers the screen correctly. No console errors.

## Known gaps
- I couldn't check the "From Jordan" tags in the browser, because the supervisor screen on this branch is still the placeholder (no Assign all button). They are covered by `tags.test.ts` and should be checked visually after the merge.
- The toast overlaps the header for its 6 s. That's the shell's existing design (top toast, like Lance), not changed here.

---

## CHANGES: feat/supervisor (worktree B)

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
