# Lance MVP: Exception Handoff: Technical Design

> Repo-root file; `CLAUDE.md` points here. Every agent reads this before touching code. **Scope is fixed. If something isn't in §4 "In", don't build it.**

## 1. One-liner

When a housekeeper can't do a room, they say why in two taps. If it still fits in their day, it just moves later on their list; if it doesn't, it goes to the supervisor's queue with the best person and time already picked.

## 2. Why (from the UX critique)

Every Lance flow assumes the happy path (start → clean → complete).

- **#3, housekeeper side: no flag for exceptions.** DND, refused service, something broken: the only outlet is a free-text note or "More actions". The room sits on the list looking dirty; the list goes stale.
- **#4, supervisor side: sees who's free, not who's best.** "Who takes them" shows room counts, not remaining time. Fewer rooms ≠ less work (checkouts and suites take longer). Assign toast doesn't name the room; no undo.

Fixed for free everywhere: plain language, no PMS codes (#1); arrival times on cards (#2).

## 3. The process and the demo

**Process:**
- **DND / come back at {time}:** if it still fits the housekeeper's day *and* the room's own deadline (e.g. ready before the next guest arrives), it stays with them, slotted into their list at the first opening at or after {time}. If it doesn't fit, it leaves their list and goes to the **assignment queue** with a recommendation.
- **Something broken:** ticket to Sam; the room leaves their list and goes to the queue marked **"Waiting on maintenance"** (no recommendation until it's marked fixed).
- **Guest declined:** leaves their list; Jordan is informed; nothing to assign.

**The supervisor has two places, not one long feed:**
1. **Summary line** (the inbox): one line, **collapsed by default**: "3 need attention · ● 1 can't be done · ● 1 late · 1 to assign". Tap it and it expands into **one list in priority order**, so it's never a heap to scroll:
   - **Can't be done** (red dot): a room no one can finish in time.
   - **Running late** (amber dot): an owned room on track to finish late.
   - **To assign:** queue rooms that someone *can* take.
   - **Waiting on a fix** (grey dot): rooms waiting on maintenance.
   - **For your info:** DNDs a housekeeper absorbed, declined service, maintenance tickets raised or fixed.

   Each row takes you to its item on the page (For your info rows don't go anywhere).
2. **Assignment queue:** **To assign** holds only rooms someone can take (escalated rooms + any room with no owner, e.g. 207), most urgent first, each with a recommendation. One tap per room, or **Assign all**. Below it, **Can't be placed**: no-one rooms as one calm line each (no button), and rooms waiting on maintenance as a muted grey line.

**Demo (~75 s, must work end to end). One phone frame; switch people via the name picker:**

0. **At load, before anyone taps:** Jordan's summary line already reads **"3 need attention · ● 1 can't be done · ● 1 late · 1 to assign"** (106, 107, 207). Tapped open: "106 can't be ready for the 11:00 arrival" → "Rosa on track to finish 1:05 · 107 at risk" → "207 needs someone". **To assign** starts with 207 and its **Give to Priya** is on screen without scrolling; 106 sits under **Can't be placed**. Here's what's already wrong.
1. **Maya** taps **Problem** on 305 → **DND · 12:00**. It fits, so 305 moves to the end of her list as "Available at 12:00". Toast: "305 moved to 12:00 · still yours · Undo". Jordan isn't bothered.
2. **Rosa** (red: on track to finish 1:05, after her 1:00 shift end) taps **Problem** on 107 → **DND · 11:30**. It doesn't fit, so 107 leaves her list. Toast: "107 sent to Jordan · Undo". Rosa is now green (12:30).
3. **Jordan.** Summary **"3 need attention · ● 1 can't be done · 2 to assign"** (Rosa's late item is gone). Tapped open: 106 → 207 → 107, then For your info: "Maya moved 305 to 12:00". **To assign**, most urgent first:
   - **207** · unassigned → Priya · "On floor 2 · free 11:50 · done 12:10 · 50 min spare"
   - **107** · Rosa flagged · DND until 11:30 → Priya

   **Can't be placed:** "● **106** · can't be ready for the 11:00 arrival · let the front desk know" (no button).
4. **Assign all** → 207 → Priya, 107 → Priya. Toast: "2 rooms assigned · 207, 107 → Priya · Undo". **3 → 1 need attention** (only 106, still under Can't be placed); To assign is empty and Assign all goes away.
5. **Team:** Maya 12:40 (20 min spare), Priya 12:48 (12), Rosa 12:30 (30). Before the flag, Rosa had fewer rooms than Maya but was the one running over, because hers were checkouts and a suite.
6. **Priya's list** ends with 207, then 107 tagged "From Jordan · available 11:30". **Skip ahead** twice (to 11:30) → 107 shows "Ready now"; Priya's 201–203 show "done · simulated".

## 4. Scope

**In**
- Housekeeper list (Start / Done / Problem), one-step Problem sheet, **Done today** section
- Supervisor screen (one scrolling page): **summary line** ("3 need attention" + dotted counts, collapsed; expands into one list grouped by priority, each row jumps to its item) → **To assign** (only rooms someone can take) with per-room recommendation + reason, Give-to (1 tap), Someone else (sheet, infeasible people greyed out with "would finish 1:03"), **Assign all** → **Can't be placed** (no-one rooms, one line each, no button; "Waiting on maintenance" rooms as a muted line) → team finish times
- Toasts that name the room, with Undo
- Role switch via the familiar "Who are you?" name picker (no PIN): Maya / Priya / Rosa / Jordan. Demo clock with Skip ahead. **Reset demo** control.
- Maintenance tickets as a simple list under **More** (shell) with a **Mark fixed** button (stands in for Sam's side; unblocks the room in the queue)

**Cut (do not build)**
Login/PIN · backend · messaging · inspection / clean → ready · property board · editing assignments that weren't flagged or unowned · drag-to-reorder · push notifications · LLM/voice · settings for durations or speeds · comparing alternative algorithms

**Product rules (non-negotiable)**
1. Never move a room that already has an owner and wasn't flagged.
2. Don't involve the supervisor unless the housekeeper can't absorb it: a DND that still fits their day stays with them.
3. Handed-off rooms **join the end** of the new owner's list, so the timeline Jordan was shown is the plan the housekeeper gets.
4. Priority is calculated (deadline, then wait time), never set by hand.
5. No typing anywhere in the core flow.
6. If no one can make it, say so: the room under Can't be placed + the top item in the summary. Never recommend an infeasible pick.
7. The summary is grouped by priority (can't be done → running late → to assign → waiting on a fix → for your info) as one ordered list, never a flat chronological feed.

## 5. The Problem sheet (always 2 taps: Problem → option)

```
┌──────────────────────────────────┐
│  ──                        ✕     │
│  305 · What's the problem?       │
│                                  │
│  Do not disturb · come back at   │
│  [11:00] [11:30] [12:00] [Later] │
│                                  │
│  Something's broken              │
│  [Light] [Leak] [AC/heat] [TV]   │
│  [Other]                         │
│                                  │
│  [ Guest declined service      ] │
└──────────────────────────────────┘
```

| Option | Effect |
|---|---|
| **DND · time** (next three half-hours strictly after now, moving with the clock, dropping any at/after shift end; "Later" = shift end = "can't get back to it today", never fits, always escalates) | **Fits** → slotted into their list, "Available at {time}", toast "305 moved to 12:00 · still yours · Undo". **Doesn't fit** → leaves list → queue with `earliestStart`, toast "107 sent to Jordan · Undo" |
| **Broken · chip** | Ticket to Sam; room **leaves the list** → queue as "Waiting on maintenance" (no recommendation until Mark fixed). Toast "Ticket sent: 305 · Light · Undo" |
| **Guest declined** | Leaves the list → shown to Jordan as "Declined · no action needed" (not in queue) |

**Problem** is a visible secondary pill on every room card, including an in-progress one (flagging mid-clean clears `startedAt`). No swipe. No room detail screen.

## 6. Flow diff vs. today (for the write-up / Loom)

| | Today in Lance | MVP |
|---|---|---|
| Housekeeper reports DND | Open room → no DND option → "More actions" or type a note; room still shows dirty; radio the supervisor | Problem → "DND · 12:00" (2 taps); moves later on their list if it fits, otherwise to the queue |
| Supervisor finds out | Outside the app | Only if the housekeeper can't absorb it: summary line (grouped by priority) + queue |
| Supervisor reassigns | Move rooms → find room → select → Assign → pick by count → Assign (~7 taps) | Give to Priya (1 tap) or Assign all (1 tap), picked by time, with reason |
| Confirmation | "1 room is with Priya" (no room, no undo) | Names the room(s) · Undo |
| New owner | No timing constraint | "Available at 12:00" → "Ready now" |
| **Total** | ~10 taps + a radio call | **3 taps** |

## 7. Scheduling (pure, deterministic, tests first)

No LLM in scheduling: instant, explainable, same answer every time.

**Durations (by room type only, same for everyone):** stayover 20, checkout 35, suite +15 (minutes). Floor change +3. **No per-person speed** (see §12).

**Timeline:** walk the housekeeper's open rooms in list order. An in-progress room comes first and ends at `startedAt + duration`. Otherwise start from `now` on the current floor. Each room: `start = max(prevEnd + floorChange, availableAt ?? -∞)`, `end = start + duration`.

**Start:** tapping Start on any card moves that room to the front of the list (it's what they're doing) and sets `startedAt = now`. Start is disabled on other cards while one room is in progress. Start is not undoable.

**Recommend(room):** for each housekeeper, `start = max(endOfTimeline + floorChange, room.earliestStart ?? now)`, `end = start + duration`. Infeasible if `end > shiftEnd` or `end > room.arrival`. Pick earliest `end`; tiebreak same floor, then most slack, then id. None feasible → `no-one`.

**Options(room):** the same computation for every housekeeper, returned with `feasible` flags. The "Someone else" sheet shows infeasible people greyed out ("would finish 1:03").

**Fits their day (DND):** insert the room into their own list before the **first room whose planned start ≥ `until`** (else at the end), with `availableAt = until`. Rooms before it keep their order; later rooms shift later. It fits if the timeline still ends ≤ shift end **and** every room still meets its guest arrival. Otherwise remove it and add it to the queue with `earliestStart = until`.

**Blocked rooms (broken):** in the queue with `blocked: true`, no recommendation, excluded from Assign all, untouched by skip. `markFixed(ticketId)` clears the block; the room then gets a recommendation like any other.

**Inbox:** derived from the event log and current plans, grouped: Urgent (no-one rooms, rooms on track to finish late) → Needs a decision (queue rooms with a feasible pick, count) → For your info (absorbed DNDs, declines, tickets raised/fixed). Newest first within a group. The supervisor sees it through `attention()`: one ordered list (can't be done → running late → to assign → waiting on a fix → for your info) with room counts per kind that add up to **Rooms needing attention**. The screen shows it as one summary line, collapsed by default.

**Deadline** = both: the room must be ready before guest arrival (if any), and the clean must end before the assignee's shift end.

**Assign all (greedy):** sort queue by deadline (arrival, else shift end), then `earliestStart`, then wait time. For each room: Recommend against *current* timelines → append to that person → next. No-one and blocked rooms stay. One undoable action.

**Rooms needing attention** = rooms in the queue (incl. blocked) + owned rooms whose projected end is after their arrival or the owner's shift end.

**Team status colours:** slack ≥ 10 min green · 0–9 amber · < 0 red.

**Reason string** (generated, never hand-written): `"On floor 2 · free 11:50 · done 12:10 · 50 min spare"`. Never mentions anyone's speed or compares people.

**Housekeeper list order:** seed lists are pre-sorted. Handed-off rooms append at the end. No other re-sorting except Start (front) and DND insert.

**Skip ahead (demo control, plays out the plan):** "the plan Jordan saw is the plan that happens."
- Rooms whose planned end ≤ new time → done, tagged "done · simulated".
- Rooms whose planned start ≤ new time < planned end → in progress, `startedAt = plannedStart` (inclusive boundary).
- Rooms started by hand finish at their planned end.
- Not simulated: queued rooms (no owner, blocked), declined rooms. DND rooms only when their planned slot arrives.
- Skip is not undoable: it clears the undo slot and dismisses any open toast. **Reset demo** is the escape hatch.

**Manual Done before planned end:** completes now; the rest of that person's day is recalculated from now (times shift earlier; owners and order don't change).

**Undo:** one level, a full-state snapshot taken before each undoable action: flag, Done, assign, Assign all, mark fixed. Start is not undoable. Switching roles dismisses the toast and clears the undo slot.

**DND time chips:** the next three half-hours **strictly after** now (at 10:30: 11:00 · 11:30 · 12:00), dropping any at or after shift end, plus "Later" (= shift end).

**Needing-attention detection at load and after every action:** any owned room whose planned end is after its owner's shift end or its guest arrival counts toward the headline and appears in the summary as **running late** (amber), as information ("Rosa on track to finish 1:05 · 107 at risk"). The supervisor can't move it (rule 1, deliberate cut, see §12); it resolves when the housekeeper flags it or the plan changes.

### Tests (Vitest, written first)
1. Timelines at start: Maya 12:40, Priya 11:50 (floor 2), Rosa 13:05 (red).
2. Durations depend only on room type (checkout 35, stayover 20, suite +15) plus 3 min per floor change.
3. Maya flags 305 DND 12:00 → fits → stays with Maya at the end of her list; Maya still finishes 12:40; queue unchanged.
4. Rosa flags 107 DND 11:30 → doesn't fit → removed from Rosa's list, added to queue; Rosa now 12:30.
5. Recommend alone: 207 → Priya 11:50–12:10 · 107 → Priya 11:53–12:28.
6. Maya is infeasible for 207 and 107 (would finish after 1:00); options() returns her greyed out with her would-finish time.
7. Recommend 106 → `no-one`.
8. Assign all → 207 Priya 11:50–12:10 · 107 Priya 12:13–12:48 · 106 stays; needing attention 3 → 1; Maya 12:40, Priya 12:48, Rosa 12:30.
9. Assigning changes only the receiving person's list (others deep-equal).
10. Undo restores exact prior state, including after Assign all and after a flag.
11. Broken flag → room removed from the list, queued as blocked, no recommendation, skipped by Assign all; after `markFixed` it gets a recommendation.
12. Inbox grouping: 106 under Urgent; Needs a decision counts only feasible queue rooms (excludes 106); Maya's absorbed DND under For your info.
13. A DND that would make any room on the list miss its guest arrival does **not** fit, even if shift end is fine.
14. Skip to 11:30 → Priya's 201–203 done (simulated), 206 in progress with startedAt 11:30; nothing else changes owner or order.
15. A blocked room in the queue is untouched across a skip and stays excluded from Assign all.
16. Skip clears the undo slot and dismisses the toast.
17. Manual Done early pulls that person's remaining rooms earlier.
18. Chips at 10:30 are 11:00 · 11:30 · 12:00 · Later; after skipping to 12:30, the 13:00 chip is dropped (only Later remains).
19. "Later" always escalates.
20. At load: needing attention = 3 (106, 207, Rosa's 107); inbox Urgent has 106 and "Rosa on track to finish 1:05".
21. Switching roles clears the undo slot; Start is not undoable.
22. Start moves the room to the front; flagging an in-progress room clears startedAt.
23. Supervisor summary (`attention()`): at load 1 can't be done + 1 late + 1 to assign = 3, in that order; after the flags 106 → 207 → 107 → For your info; a blocked room counts as "waiting on a fix" after to assign; counts always add up to Rooms needing attention.

## 8. Seed data (verified by hand)

Clock is one constant: **10:30 AM**. Shifts end **1:00 PM**. Nobody is mid-room at start.

| Housekeeper | Starts on | Rooms in order | Finish |
|---|---|---|---|
| Maya | Floor 3 | 305 stay · 302 stay · 303 stay · 304 checkout · 306 checkout | 12:40 |
| Priya | Floor 2 | 201 · 202 · 203 · 206 (stays) | 11:50 |
| Rosa | Floor 1 | 101 checkout · 104 checkout · 105 checkout **suite** · 107 checkout | 13:05 (over) |

Rosa has fewer rooms than Maya (4 vs 5) yet is the one running over: checkouts and a suite take longer. Count ≠ work, with no one rated.

**Queue at start:** **106** checkout, floor 1, guest arrives 11:00 (no one can make it) · **207** stayover, floor 2, unassigned.

**Copy:** stayover → "Guest staying · tidy & refresh"; checkout → "Guest checked out · full clean"; suite → "· Suite"; arrival badge "Guest arrives 11:00" (red if < 60 min on a housekeeper's list; neutral on the supervisor screen, see §9).

**People:** Maya Chen, Priya Patel, Rosa Alvarez (housekeepers) · Jordan Blake (supervisor) · Sam Okafor (maintenance, ticket assignee).

## 9. Visual style: match Lance

White background · cards with 1px `#E5E7EB` border, ~14px radius · room number bold in a `#F3F4F6` chip · primary = **black pill**, ~48–52px · secondary = white pill, light border · accent muted green `#2F6F5E` / `#E8F3EE`; amber for tight and for running late; **red `#DC2626` only for "can't be done"**: on the supervisor screen the only red is the can't-be-done dot and the part of a team bar past shift end (no red fills, borders or text) · black toasts at top (bold title, grey subtitle, ✓, **Undo** on the right) · bottom sheets with grabber + ✕ · header: initials avatar (tap → name picker) + bold title + bell · bottom tab bar (Messages / My work / More; Messages is inert) · Inter / system-ui; titles 20–22 bold, card titles 16 semibold, meta 13 grey · tap targets ≥ 48px · 390px wide, centered max ~430px on desktop.

## 10. Architecture

Vite + React + TS + Tailwind v4, Vitest, Playwright. Vercel (public). No backend. State: `useReducer` + one-level undo snapshot, no persistence (refresh = fresh demo).

```
src/
  domain/   types.ts · seed.ts · schedule.ts · reducer.ts · selectors.ts · *.test.ts   ← pure
  state/    store.tsx   (context + useReducer, exposes state, dispatch, selectors)
  ui/       Button · Card · BottomSheet · Toast · Pill · Header · TabBar · Avatar · RoomChip
  features/ shell/ (Phase 0) · housekeeper/ · supervisor/
```

**Store contract (frozen after Phase 0):** see `src/domain/types.ts` (Action, State, view types) and `src/domain/selectors.ts`. Highlights:

- Actions: `start`, `complete`, `flag` (dnd/declined/broken), `assign`, `assignAll`, `undo`, `markFixed`, `advanceClock`, `setRole`, `dismissToast`, `reset`.
- `state.toast: { title, subtitle?, undoable } | null` is set by the reducer, so the UI never guesses outcomes.
- `state.events`: explicit event log feeding For your info.
- Selectors: `roomsFor`, `doneFor`, `queue`, `recommendation`, `options`, `projections`, `roomsNeedingAttention`, `inbox`, `attention`, `dndChips`, `tickets`.

## 11. Build plan

**Phase 0: foundation + shell (main agent, sequential).** A deploy live in the first 15 min. Then domain + all §7 tests green → store with the complete frozen contract → ui primitives → shell last (name picker, clock + Skip ahead, Reset demo, tab bar, tickets list under More). Commit to `master`. If Phase 0 runs past 75 min, cut the shell to name picker + skip + reset before starting agents.

**Phase 1: two parallel worktrees (one subagent each).** Agents may not edit `domain/`, `state/`, `ui/`, `features/shell/`. If something's missing, stub it locally and list it in `CHANGES.md`.

| Worktree | Branch | Owns | Done when |
|---|---|---|---|
| A: Housekeeper | `feat/housekeeper` | `features/housekeeper/**` | List; Start/Done; Done today; Problem sheet (all 3 options, fits / doesn't-fit toasts); undo; "Available at" / "From Jordan" / "Ready now" / "done · simulated" tags |
| B: Supervisor | `feat/supervisor` | `features/supervisor/**` | Rooms-needing-attention headline; inbox grouped Urgent / Needs a decision / For your info; queue with reasons; Give-to; Choose someone else (greyed infeasible); Assign all; no-one warning + front-desk copy; "Waiting on maintenance" items; team colours |

**Phase 2: user review.** **Phase 3: merge agent:** merge both branches into `master`, tests green, Playwright run of §3 at 390×844 with a screenshot per step. Fix only what blocks the demo.

**Handoff:** `CLAUDE.md` (how to run, where things live, the product rules) + `WALKTHROUGH.md` (each file, what it does, why).

## 12. Metric, risks, next

**Primary metric:** share of flagged / unowned rooms cleaned before their deadline (shift end or guest arrival). **Secondary:** supervisor taps per reassignment (target 1).

**Risks / edge cases / deliberate cuts**
- Depends on the supervisor acting → next: push notification, or auto-assign after a timeout.
- **Deliberate cut:** the supervisor can't pre-emptively move an at-risk room (e.g. Rosa's 107 at load). Next: "Move to queue" on the Urgent item, reusing the escalation path.
- **No-one rooms have no in-app action** (106): the warning says "Let the front desk know", no button. Next: front-desk handoff.
- **No per-person speed, on purpose.** Rating individual speed would make the app compare coworkers (competitive, toxic dynamics), punish fast staff with more rooms (so people slow down), and push rushing over quality. If added later: learned from Lance's existing start/complete timestamps, opt-in, never displayed, used only to balance load, and capped so faster people don't simply absorb more work.
- Greedy is a heuristic, not guaranteed optimal; fine for a handful of queued rooms, explainable, instant. Next: check against exhaustive search on small queues.
- DND "Later" is a guess → room waits at the shift-end boundary.

**Next:** better time estimates per hotel and room type (from Lance's existing timers) · free-text / voice exceptions parsed by an LLM into the same `flag` actions · clean → ready inspection step · per-hotel duration settings.
