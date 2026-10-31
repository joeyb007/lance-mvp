import { fmt } from '../../domain/format'
import { HOUSEKEEPER_IDS, PEOPLE } from '../../domain/seed'
import { projections, roomsFor } from '../../domain/selectors'
import type { HousekeeperId, Projection, TeamStatus } from '../../domain/types'
import { useStore } from '../../state/store'
import { Avatar, Card, Section } from '../../ui'

// Colour rule (TDD §9): red only for "can't be done". Running late reads amber; the only red is the bar past shift end.
const TEXT: Record<TeamStatus, string> = { green: 'text-accent', amber: 'text-amber', red: 'text-amber' }
// Rooms inside the shift take the status colour (amber when the person is over); rooms past shift end are solid red.
const BAR: Record<TeamStatus, string> = { green: 'bg-accent', amber: 'bg-amber', red: 'bg-amber' }

function finishText(p: Projection): string {
  if (p.roomsLeft === 0) return 'All rooms done'
  if (p.slack < 0) return `Finishes ${fmt(p.finish)} · ${-p.slack} min over`
  return `Done by ${fmt(p.finish)} · ${p.slack} min spare`
}

/** Team finish times (by time, never by speed or rank). Colour = slack status from `projections()`. */
export function Team() {
  const { state } = useStore()
  const proj = projections(state)
  const shiftEnd = state.housekeepers.maya.shiftEnd

  return (
    <Section title="Team" right={<span className="text-[13px] text-muted">Shifts end {fmt(shiftEnd)}</span>} className="pb-8">
      <Card className="divide-y divide-line" data-testid="team">
        {HOUSEKEEPER_IDS.map((id) => (
          <TeamRow key={id} id={id} p={proj[id]} />
        ))}
      </Card>
    </Section>
  )
}

function TeamRow({ id, p }: { id: HousekeeperId; p: Projection }) {
  const { state } = useStore()
  const hk = state.housekeepers[id]
  const plan = roomsFor(state, id)
  // Bar: now → shift end (or the planned finish, if later). One segment per remaining room, sized by its planned
  // time, so "fewer rooms" doesn't look like "less work". A tick marks shift end.
  const windowEnd = Math.max(hk.shiftEnd, p.finish)
  const span = Math.max(1, windowEnd - state.now)
  const pct = (m: number) => `${(Math.max(0, m - state.now) / span) * 100}%`

  return (
    <div className="flex scroll-mt-3 items-center gap-3 px-4 py-3" id={`team-${id}`} data-testid={`team-${id}`}>
      <Avatar initials={PEOPLE[id].initials} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[16px] font-semibold">{PEOPLE[id].name}</span>
          <span className="shrink-0 text-[13px] text-muted">
            {p.roomsLeft} {p.roomsLeft === 1 ? 'room' : 'rooms'} left
          </span>
        </div>
        <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-chip" aria-hidden>
          {plan.map((r) => (
            <span
              key={r.room.id}
              data-danger={r.end > hk.shiftEnd ? 'over-shift' : undefined}
              className={`absolute top-0 h-full rounded-full ${r.end > hk.shiftEnd ? 'bg-danger' : BAR[p.status]}`}
              style={{ left: pct(r.start), width: `calc(${pct(r.end)} - ${pct(r.start)} - 2px)` }}
            />
          ))}
          {windowEnd > hk.shiftEnd && <span className="absolute -top-1 h-3.5 w-0.5 bg-ink" style={{ left: pct(hk.shiftEnd) }} />}
        </div>
        <div className={`mt-1.5 text-[13px] font-semibold ${TEXT[p.status]}`}>{finishText(p)}</div>
      </div>
    </div>
  )
}
