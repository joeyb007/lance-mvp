# Lance: exception handoff (MVP)

**Live:** https://lance-delta.vercel.app (open on a phone, or any browser: it renders one phone frame)

When a housekeeper can't do a room, she says why in two taps. If it still fits her day it just moves later on her list; if it doesn't, it goes to the supervisor's queue with the best person and time already picked, by remaining time, not room count.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

Pick a name on "Who are you?" to switch people (no PIN). The dark bar at the top is a demo control: **Skip 30 min** plays the plan forward, **Reset** starts the demo over.

## Tests

```bash
npm test               # unit tests (Vitest): scheduling, store, selectors, card tags
npm run e2e            # the demo clicked through at 390×844 (Playwright): screenshots land in e2e/screenshots/
```

First e2e run on a new machine: `npx playwright install chromium`.

## Read next

- `TDD.md`: the design: problem, demo script, scope, product rules, scheduling, tests.
- `WALKTHROUGH.md`: every file, what it does, and why.
- `CLAUDE.md`: conventions for working in this repo (human or AI).
