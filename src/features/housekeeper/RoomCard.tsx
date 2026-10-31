import { useEffect, useRef, useState } from 'react'
import { cleanLabel, fmt } from '../../domain/format'
import { firstName } from '../../domain/seed'
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

/**
 * Nothing moves under her thumb: Start turns into Done in the same spot (the in-progress state replaces the
 * "Planned" line, which has a fixed height, and the tags row keeps its height). Because Done is exactly where
 * Start was, a double tap would always hit it, so Done shows disabled for a moment after Start, then fades in.
 * (Done still has a toast with Undo as the last safety net.)
 */
const DONE_ARM_MS = 800

/** One open room on "Your rooms". Start → Done, Problem on every open card, Hand off when it runs past shift end. */
export function RoomCard({ plan, now, shiftEnd, busy, next, onStart, onDone, onProblem, onHandOff }: Props) {
  const tagsRow = useRef<HTMLDivElement>(null)
  const [lockedTagsHeight, setLockedTagsHeight] = useState<number>()
  const [doneArmed, setDoneArmed] = useState(true)
  const armTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(armTimer.current), [])
  const tapStart = () => {
    setLockedTagsHeight(tagsRow.current?.offsetHeight) // starting may drop a tag ("Ready now"); keep the row's height
    setDoneArmed(false)
    clearTimeout(armTimer.current)
    armTimer.current = setTimeout(() => setDoneArmed(true), DONE_ARM_MS)
    onStart()
  }
  const { room, start, end, waiting } = plan
  const inProgress = room.status === 'in_progress'
  const tags = roomTags(plan, now, shiftEnd)

  return (
    <li
      data-testid={`room-${room.id}`}
      className={`overflow-hidden rounded-[14px] border bg-white ${inProgress ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : 'border-line'}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <RoomChip id={room.id} />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold leading-snug">{cleanLabel(room)}</div>
            {/* Fixed height so swapping "Planned" for "In progress" never moves the buttons. */}
            <div className="mt-0.5 flex h-6 items-center gap-2 whitespace-nowrap text-[13px] text-muted tabular-nums">
              {inProgress ? (
                <span data-testid="in-progress">
                  <Pill tone="green">● In progress · until {fmt(end)}</Pill>
                </span>
              ) : (
                <>
                  {next && (
                    <span data-testid="next">
                      <Pill tone="dark">Next</Pill>
                    </span>
                  )}
                  Planned {fmt(start)}–{fmt(end)}
                </>
              )}
            </div>
          </div>
        </div>

        <div ref={tagsRow} style={inProgress && lockedTagsHeight ? { minHeight: lockedTagsHeight } : undefined}>
        {(tags.length > 0 || onHandOff) && (
          <div className="flex items-center gap-2 pt-3">
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
        {/* A handed-over room carries the note that sent it to the queue: Priya needs to know about the mini fridge. */}
        {room.fromSupervisor && room.note && room.flaggedBy && (
          <p className="mt-3 rounded-[10px] bg-chip px-3 py-2 text-[14px] leading-snug" data-testid={`note-${room.id}`}>
            <span className="font-semibold">Note from {firstName(room.flaggedBy)}:</span> {room.note}
          </p>
        )}
        </div>

        <div className="mt-3 flex gap-2">
          {inProgress ? (
            <Button className="flex-1 duration-500" onClick={onDone} disabled={!doneArmed} data-testid={`complete-${room.id}`}>
              Done
            </Button>
          ) : (
            <Button variant={next ? 'primary' : 'secondary'} className="flex-1" onClick={tapStart} disabled={busy || waiting}>
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
