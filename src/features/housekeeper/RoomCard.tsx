import { cleanLabel, fmt } from '../../domain/format'
import type { Minutes, PlannedRoom } from '../../domain/types'
import { Button, Pill, RoomChip } from '../../ui'
import { roomTags } from './tags'

interface Props {
  plan: PlannedRoom
  now: Minutes
  shiftEnd: Minutes
  /** Another room on this list is in progress: Start is disabled (the reducer enforces it too). */
  busy: boolean
  /** The next room to do: the only card whose Start is the black primary pill. */
  next: boolean
  onStart: () => void
  onDone: () => void
  onProblem: () => void
  /** Set when this room is planned to end after her shift end and can be handed off. */
  onHandOff?: () => void
}

/** One open room on "Your rooms". Start → Done, Problem on every open card, Hand off when it runs past shift end. */
export function RoomCard({ plan, now, shiftEnd, busy, next, onStart, onDone, onProblem, onHandOff }: Props) {
  const { room, start, end, waiting } = plan
  const inProgress = room.status === 'in_progress'
  const tags = roomTags(plan, now, shiftEnd)

  return (
    <li
      data-testid={`room-${room.id}`}
      className={`overflow-hidden rounded-[14px] border bg-white ${inProgress ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : 'border-line'}`}
    >
      {inProgress && (
        <div className="flex items-center gap-2 bg-accent-soft px-4 py-2.5 text-[14px] font-semibold text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="flex-1">In progress · since {fmt(room.startedAt ?? start)}</span>
          <span className="font-medium tabular-nums">until {fmt(end)}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3">
          <RoomChip id={room.id} />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold leading-snug">{cleanLabel(room)}</div>
            {!inProgress && (
              <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted tabular-nums">
                {next && (
                  <span data-testid="next">
                    <Pill tone="dark">Next</Pill>
                  </span>
                )}
                Planned {fmt(start)}–{fmt(end)}
              </div>
            )}
          </div>
        </div>

        {(tags.length > 0 || onHandOff) && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {tags.map((t) => (
                <Pill key={t.text} tone={t.tone}>
                  {t.text}
                </Pill>
              ))}
            </div>
            {onHandOff && (
              <Button variant="secondary" className="shrink-0 px-4" onClick={onHandOff} data-testid={`handoff-${room.id}`}>
                Hand off
              </Button>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {inProgress ? (
            <Button className="flex-1" onClick={onDone}>
              Done
            </Button>
          ) : (
            <Button variant={next ? 'primary' : 'secondary'} className="flex-1" onClick={onStart} disabled={busy || waiting}>
              Start
            </Button>
          )}
          <Button variant="secondary" className="min-w-[112px]" onClick={onProblem}>
            Problem
          </Button>
        </div>
      </div>
    </li>
  )
}
