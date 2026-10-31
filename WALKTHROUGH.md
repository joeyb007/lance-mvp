# Walkthrough: every file, what it does, why

Read in this order: the **domain** (where every decision lives), then the **store**, the shared **ui**, and the three **feature** folders. The UI is deliberately thin: it shows what the domain decided and dispatches actions; it never schedules, ranks or checks feasibility.

## Docs

| File | What | Why |
|---|---|---|
| `README.md` | Live link, two-line pitch, how to run, test, e2e | The 30-second entry point |
| `TDD.md` | Problem, demo script (§3), scope + product rules (§4), Problem sheet (§5), scheduling + test list (§7), seed (§8), style (§9), architecture (§10), risks/next (§12) | Single source of truth; agents and reviewers read it before code |
| `CLAUDE.md` | Commands, layout, how UI talks to state, rules, conventions, learnings | Working agreement for anyone (human or AI) touching the repo |
| `CHANGES.md` | Per-branch notes from the parallel build (Phase 1) | Audit trail of what each agent built, stubbed, or deviated on |
| `context/` | Lance screenshots + annotated critique | The input: what we're fixing |

## `src/domain/`: pure logic, no React

| File | What | Why |
|---|---|---|
| `types.ts` | `Room`, `Housekeeper`, `Ticket`, `DomainEvent`, `State`/`Snapshot`, the `Action` union, and view types (`PlannedRoom`, `Recommendation`, `QueueItem`, …) | The contract that let two agents build both sides in parallel without touching each other's code |
| `seed.ts` | Clock 10:30, shifts end 1:00, people, rooms and lists | Engineered so the person with **fewer rooms (Rosa, 4) runs over** and the one with more (Maya, 5) doesn't: count ≠ work, with no one rated |
| `schedule.ts` | `duration` (stayover 20, checkout 35, suite +15), floor change +3, `planList`/`timeline`, `optionFor`, `recommend`, `queueOrder` | Deterministic, explainable, instant: no LLM, no per-person speed. Recommend = earliest finish among feasible people; never an infeasible pick |
| `reducer.ts` | Every action: start, complete, flag (DND / broken / declined / can't get in / other), handOff, assign, assignAll (greedy, recomputing after each), markFixed, advanceClock (plays the plan forward), undo, setRole, reset | One place for state changes, toasts and **one-level undo** via a full-state snapshot (always correct, even for Assign all) |
| `selectors.ts` | `roomsFor`, `doneFor`, `queue` (+ labels), `options`, `recommendation`, `projections`, `lateRooms`, `roomsNeedingAttention`, `attention` (the supervisor summary), `inbox`, `dndChips`, `tickets` | Read-only views so UI code never re-derives decisions; the summary order (can't be done → late → to assign → waiting on a fix → FYI) is defined here |
| `format.ts` | `fmt` (630 → "10:30"), `cleanLabel` ("Guest checked out · full clean"), `arrivalBadge`, `ISSUE_LABEL` | Plain language everywhere (critique #1) and arrival times on cards (critique #2) |
| `schedule.test.ts` | TDD §7 tests 1–22: seed timelines, DND fits / escalates, recommendations, Assign all, undo, skip ahead, chips, Start rules | Written before the scheduler; pins every number in the demo |
| `selectors.test.ts` | Supervisor summary (`attention`) order and counts | Counts must always add up to "N need attention" |
| `handoff.test.ts` | Hand off (Rosa → 107 → Priya 12:13–12:48), rejections, undo, Reset keeps person, "Rosa handed off 107" row | The runover fix |
| `problem.test.ts` | Can't get in, Other… notes (queue / ticket), empty-note rejection, notes travel to the new owner | The Problem sheet reasons |

## `src/state/`

| File | What | Why |
|---|---|---|
| `store.tsx` | `StoreProvider` (`useReducer(reducer, seedState())`) and `useStore()` | Tiny on purpose: no persistence, so a refresh is a fresh demo |

## `src/ui/`: shared primitives (Lance's visual language)

| File | What | Why |
|---|---|---|
| `Button.tsx` | Pill button: black primary, white secondary; every tappable button in the app is ≥ 48 px | Lance's black-pill / white-pill hierarchy; one loud button per screen |
| `Card.tsx`, `Pill.tsx`, `RoomChip.tsx`, `Avatar.tsx`, `Section.tsx`, `Icon.tsx` | Bordered card, status label, grey room chip, initials avatar, section heading (+ subtitle), outline icons | Match Lance's look so the MVP reads as a Lance feature, not a new app |
| `BottomSheet.tsx` | Sheet with grabber + ✕, **portaled into `#phone-frame`** | So it covers the screen even when opened from a scrolled list (bug found by both feature agents, fixed once here) |
| `Toast.tsx` | Black toast at the top, ✓, title/subtitle clamped to two lines, **Undo** | Every toast names the room; Undo is the safety net (critique #4: the old toast named nothing and had no undo) |
| `Header.tsx`, `TabBar.tsx` | Avatar (tap → name picker) + title + bell; Messages / My work / More | Familiar Lance chrome |
| `index.ts` | Barrel export | |

## `src/features/shell/`

| File | What | Why |
|---|---|---|
| `Shell.tsx` | Sign-in picker → header → screen for the current person → tab bar; toast + name-picker sheet. `<main>` is keyed by person+tab so switching starts at the top | One phone, role switch via Lance's own "Who are you?" (no PIN: not what we're testing) |
| `PhoneFrame.tsx` | Full-bleed on a phone, centred ~430 px on desktop; `#phone-frame` hosts sheets and toasts | Demo works on any screen; overlays stay inside the phone |
| `DemoBar.tsx` | Clock · Skip 30 min · Reset, visually separate from the app | Demo-only controls, clearly not product UI |
| `NamePicker.tsx` | Jordan / Maya / Priya / Rosa | |
| `MoreScreen.tsx` | Maintenance tickets (note or issue) with **Mark fixed** | Stands in for Sam's side so a broken room can come back to the queue |

## `src/features/housekeeper/`: "My work"

| File | What | Why |
|---|---|---|
| `HousekeeperHome.tsx` | Summary banner → "Your rooms · in order" (subtitle "guest arrivals first, then by floor · new rooms join the end") → cards → Done today; owns the Problem sheet | Makes the order visible and the next action obvious |
| `SummaryLine.tsx` | "5 rooms left · done by 12:40" (green), or **amber** "On track to finish 1:05 · 5 min over" with **Hand off 107** | A warning she can act on, not an alarm |
| `RoomCard.tsx` | Room chip, label, fixed-height status line ("Next" + planned time, or "In progress · until …"), tags, note from the flagger, Start→Done + Problem (+ Hand off) | **Nothing moves under her thumb**: Done replaces Start in the exact same box; Done is disabled for 800 ms after Start (visible) so a double tap can't complete the room (bug 4) |
| `tags.ts` (+ `tags.test.ts`) | Which pills a card shows: Available at / Ready now / From Jordan / Guest arrives / Runs past 1:00 | Pure and tested, so the card stays dumb |
| `ProblemSheet.tsx` | Three sections of 4-column 52 px chips: come back at · broken · can't clean it; **Other…** swaps to one short field (the only typing), headed with where the note goes | Two taps for everything except Other…; no free-text note that "never becomes a work order" (critique #3) |
| `DoneToday.tsx` | Completed rooms, "done · simulated" when Skip ahead finished them | Honest about what was tapped vs simulated |

## `src/features/supervisor/`: "Housekeeping"

| File | What | Why |
|---|---|---|
| `SupervisorHome.tsx` | One scrolling page: summary → To assign → Can't be placed → Team | Calm, one page, the decision above the fold |
| `AttentionSummary.tsx` | "3 need attention · ● 1 can't be done · ● 1 late · 1 to assign", collapsed; expands into one priority-ordered list whose rows jump to their item | Replaces a feed of red cards; grouped by priority (rule 7) |
| `AssignQueue.tsx` | "To assign · most urgent first" (only rooms someone can take) · Best: Priya + reason · **Give to Priya** · Someone else · **Assign all** | Critique #4: picked by time, not room count, with the reason shown; 1 tap per room |
| `WhoTakesSheet.tsx` | Every housekeeper's would-be slot; infeasible people greyed out ("Would finish 1:03") | Lets the supervisor override without ever offering an infeasible pick (rule 6) |
| `CantPlace.tsx` | No-one rooms (one red dot, "let the front desk know") and rooms waiting on a fix (grey dot) | Rule 6, said calmly; red only for "can't be done" |
| `Team.tsx` | Finish time, spare minutes, rooms left, a bar sized by planned time | Shows count ≠ work without ranking anyone |

## Root files

| File | What |
|---|---|
| `e2e/demo.spec.ts` | Five Playwright scenarios at 390×844 with screenshots: TDD §3 demo, hand-off path, Problem sheet (note reaches Priya), double tap on Start, Start never moves the buttons. Also checks the colour rule (no stray red on the supervisor screen) and that Give to Priya is above the fold |
| `e2e/screenshots/` | Committed output of the last e2e run |
| `playwright.config.ts` | Builds, serves `vite preview` on :4317, phone viewport |
| `vite.config.ts` | React + Tailwind v4 plugins; Vitest picks up `src/**/*.test.ts` |
| `src/index.css` | Tailwind import + colour tokens (`accent`, `amber`, `danger`, `line`, `chip`, …) and sheet/toast animations |
| `index.html`, `src/main.tsx`, `src/App.tsx` | Entry: `<StoreProvider><Shell/></StoreProvider>` |
| `package.json`, `tsconfig*.json`, `.oxlintrc.json` | Scripts (`dev`, `build`, `test`, `e2e`, `lint`), strict TS, lint |
