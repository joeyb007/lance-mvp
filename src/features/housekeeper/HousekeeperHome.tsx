// Housekeeper "My work" (worktree A). Everything comes from selectors; nothing is scheduled or sorted here.
import { useCallback, useState } from 'react'
import { dndChips, doneFor, projections, roomsFor } from '../../domain/selectors'
import type { HousekeeperId, Issue } from '../../domain/types'
import { useStore } from '../../state/store'
import { Card, Icon, Section } from '../../ui'
import { DoneToday } from './DoneToday'
import { ProblemSheet } from './ProblemSheet'
import { RoomCard } from './RoomCard'
import { SummaryLine } from './SummaryLine'

export function HousekeeperHome({ housekeeperId }: { housekeeperId: HousekeeperId }) {
  const { state, dispatch } = useStore()
  const [problemId, setProblemId] = useState<string | null>(null)
  const closeSheet = useCallback(() => setProblemId(null), [])

  const plan = roomsFor(state, housekeeperId) // already in plan order: never re-sort
  const done = doneFor(state, housekeeperId)
  const projection = projections(state)[housekeeperId]
  const shiftEnd = state.housekeepers[housekeeperId].shiftEnd
  const busy = plan.some((p) => p.room.status === 'in_progress')
  // One loud button per screen: only the next startable room gets the black Start (any room can still be started).
  const nextId = busy ? null : plan.find((p) => p.room.status === 'todo' && !p.waiting)?.room.id

  // Only open the sheet for a room that is still on this person's list (survives role switches / undo).
  const sheetRoom = plan.some((p) => p.room.id === problemId) ? problemId : null

  const flag = (extra: { reason: 'dnd'; until: number } | { reason: 'broken'; issue: Issue } | { reason: 'declined' }) => {
    if (!sheetRoom) return
    dispatch({ type: 'flag', roomId: sheetRoom, ...extra })
    setProblemId(null)
  }

  return (
    <div className="pb-8 pt-1">
      {plan.length > 0 && (
        <div className="px-5 pb-5">
          <SummaryLine projection={projection} shiftEnd={shiftEnd} />
        </div>
      )}

      <Section title="Assigned to you" count={plan.length}>
        {plan.length === 0 ? (
          <Card className="flex flex-col items-center px-6 py-8 text-center" data-testid="empty">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="check" size={24} />
            </span>
            <div className="text-[16px] font-semibold">Your list is clear</div>
            <div className="mt-1 text-[13px] text-muted">Nothing left for today. New rooms from Jordan will show up here.</div>
          </Card>
        ) : (
          <ul className="space-y-3" data-testid="assigned">
            {plan.map((p) => (
              <RoomCard
                key={p.room.id}
                plan={p}
                now={state.now}
                shiftEnd={shiftEnd}
                busy={busy}
                next={p.room.id === nextId}
                onStart={() => dispatch({ type: 'start', roomId: p.room.id })}
                onDone={() => dispatch({ type: 'complete', roomId: p.room.id })}
                onProblem={() => setProblemId(p.room.id)}
              />
            ))}
          </ul>
        )}
      </Section>

      <DoneToday rooms={done} />

      <ProblemSheet
        roomId={sheetRoom}
        chips={dndChips(state, housekeeperId)}
        onClose={closeSheet}
        onDnd={(until) => flag({ reason: 'dnd', until })}
        onBroken={(issue) => flag({ reason: 'broken', issue })}
        onDeclined={() => flag({ reason: 'declined' })}
      />
    </div>
  )
}
