# Lance MVP: Exception Handoff

Mobile-first clickable MVP for a Lance take-home. **Read `TDD.md` first.** Scope is fixed: if it's not in TDD §4 "In", don't build it.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (open at phone width, or any width: it renders one phone frame)
npm test           # Vitest: domain/scheduling tests (TDD §7)
npm run build      # tsc + vite build
npm run e2e        # Playwright demo script (Phase 3)
```

## Where things live

```
src/domain/     PURE. types.ts (frozen contract) · seed.ts · schedule.ts · reducer.ts · selectors.ts · format.ts · schedule.test.ts
src/state/      store.tsx: StoreProvider + useStore() → { state, dispatch }
src/ui/         Shared primitives: Button, Card, Pill, RoomChip, Avatar, BottomSheet, Toast, Header, TabBar, Section
src/features/
  shell/        Phone frame, demo bar (clock / Skip 30 min / Reset), "Who are you?" picker, tab bar, More → tickets
  housekeeper/  HousekeeperHome({ housekeeperId }): worktree A
  supervisor/   SupervisorHome(): worktree B
```

## How feature code talks to state

```tsx
const { state, dispatch } = useStore()
roomsFor(state, 'maya')                 // PlannedRoom[]: { room, start, end, late, waiting }
dispatch({ type: 'flag', roomId: '305', reason: 'dnd', until: 720 })
state.toast                             // set by the reducer; <Toast/> in the shell renders it. Don't render your own.
```

Times are **minutes since midnight** (`630` = 10:30). Format with `fmt()` from `domain/format.ts`. Copy helpers: `cleanLabel`, `arrivalBadge`, `ISSUE_LABEL`.

## Rules for Phase 1 agents

- **Only edit files inside your own feature folder.** Do not edit `src/domain/`, `src/state/`, `src/ui/`, `src/features/shell/`.
- Missing a selector, action or primitive? **Stub it locally** in your folder and list it in `CHANGES.md` at the repo root of your branch.
- Keep the exported component name and props of your `*Home.tsx`.
- Every tap target ≥ 48px. No typing anywhere. Plain language, no PMS codes (VD/OC/QNQN).
- Don't re-sort lists, don't compute priority by hand, don't call schedule logic with your own rules: use selectors.
- `npm test` and `npm run build` must pass before you finish.

## Product rules (non-negotiable, TDD §4)

1. Never move a room that already has an owner and wasn't flagged.
2. Don't involve the supervisor unless the housekeeper can't absorb it.
3. Handed-off rooms join the end of the new owner's list.
4. Priority is calculated, never set by hand.
5. No typing in the core flow.
6. If no one can make it, say so. Never recommend an infeasible pick.
7. The inbox is grouped by priority, never a flat feed.

No per-person speed, anywhere. Durations depend on room type only.
