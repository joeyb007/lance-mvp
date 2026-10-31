# Lance MVP: Exception Handoff

Mobile-first clickable MVP for a Lance take-home. **Read `TDD.md` first**: it is the source of truth for scope, product rules and the demo. `README.md` has the live link; `WALKTHROUGH.md` explains every file.

**Status: feature freeze.** Only fix what breaks. Anything new goes in TDD §12 "Next", not in code.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (one phone frame at any width)
npm test           # Vitest: domain + card-tag tests
npm run build      # tsc + vite build (must pass; strict unused-locals)
npm run e2e        # Playwright: TDD §3 demo + hand-off + Problem sheet + double tap + layout stability, 390×844
npx oxlint src     # one known warning (fast refresh in state/store.tsx); no new ones
vercel deploy --prod --yes   # production alias: https://lance-delta.vercel.app
```

## Where things live

```
src/domain/     PURE, no React. types.ts (contract) · seed.ts · schedule.ts · reducer.ts · selectors.ts · format.ts · *.test.ts
src/state/      store.tsx: StoreProvider + useStore() → { state, dispatch }
src/ui/         Shared primitives: Button, Card, Pill, RoomChip, Avatar, BottomSheet (portals into #phone-frame), Toast, Header, TabBar, Section, Icon
src/features/
  shell/        Phone frame, demo bar (clock / Skip 30 min / Reset), "Who are you?" picker, tab bar, More → maintenance tickets
  housekeeper/  "My work": summary banner, room cards (Start/Done, Problem, Hand off), Problem sheet, Done today
  supervisor/   Summary line, To assign queue, Can't be placed, Team
e2e/            demo.spec.ts + committed screenshots
```

## How UI code talks to state

```tsx
const { state, dispatch } = useStore()
roomsFor(state, 'maya')                  // PlannedRoom[] in plan order: never re-sort in UI
dispatch({ type: 'flag', roomId: '305', reason: 'dnd', until: 720 })
state.toast                              // set by the reducer; the shell's <Toast/> renders it (with Undo)
```

- Times are **minutes since midnight** (`630` = 10:30). Format with `fmt()`.
- UI never computes schedules, priority, feasibility or recommendations: use selectors (`queue`, `recommendation`, `options`, `attention`, `projections`, `dndChips`, …). Filtering a selector's output is fine.
- Every user action that changes state goes through the reducer, which owns toasts and one-level undo (full-state snapshot).
- Copy helpers: `cleanLabel`, `arrivalBadge`, `ISSUE_LABEL`. Plain language, never PMS codes (VD/OC/QNQN).

## Product rules (non-negotiable, TDD §4)

1. Never move a room that already has an owner and wasn't flagged.
2. Don't involve the supervisor unless the housekeeper can't absorb it.
3. Handed-off rooms join the end of the new owner's list.
4. Priority is calculated, never set by hand.
5. No typing in the core flow. The only text field is Other…, under broken (creates a ticket) and under can't clean it (goes to the queue), for what the chips don't cover.
6. If no one can make it, say so. Never recommend an infeasible pick.
7. The supervisor summary is grouped by priority, never a flat feed.

Also: no per-person speed anywhere (durations by room type only). Red only for "can't be done". Tap targets ≥ 48 px. Nothing moves under the thumb on Start → Done.

## Working conventions

- **Tests first for domain logic.** Write the test, see it fail, then implement.
- **Prove a test can fail.** After writing a regression test, break the fix on purpose and confirm the test goes red (we caught a double-tap test that passed with the guard removed).
- **Look at the screenshots.** e2e passing isn't enough; open the PNGs and check hierarchy, overflow at 390 px, colour, and what's above the fold.
- **One owner per folder when working in parallel.** Shared code (`domain/`, `state/`, `ui/`, `shell/`) is frozen during a parallel phase; a branch that needs something stubs it locally and lists it in `CHANGES.md`.

## Learnings from building this

- **Worktree base commit.** The agent worktree tool created every worktree from the commit at session start (the initial commit, before any app code), not current `master`. All four agents had to `git reset --hard master` first. **When spawning an agent in a worktree, tell it to reset to `master` and verify `git log` before branching.**
- **Don't `git add -A` from the repo root while agent worktrees exist** under `.claude/worktrees/`: it adds them as embedded repos. They're gitignored now.
- **Shared primitives must work in their real container.** `BottomSheet` was `absolute inset-0` inside a scrolling `<main>`; both feature agents worked around it separately. Fixed once, at the source (portal into `#phone-frame`).
- **`&&` chains hide skipped steps.** A failed `git rm`/`grep` silently skipped later edits twice; check each step's effect.
- **Verify deploys by content, not hash.** Vercel builds remotely, so bundle hashes differ from local; fetch the live JS and grep for strings that only exist in the new code.
