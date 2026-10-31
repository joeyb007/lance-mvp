# CHANGES: feat/housekeeper (worktree A)

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
