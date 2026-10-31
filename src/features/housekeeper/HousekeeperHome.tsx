// Housekeeper "My work" (worktree A). Everything comes from selectors; nothing is scheduled or sorted here.
import { useCallback, useState } from 'react'
import { dndChips, doneFor, projections, roomsFor } from '../../domain/selectors'
import type { Action, HousekeeperId } from '../../domain/types'
import { useStore } from '../../state/store'
import { Card, Icon, Section } from '../../ui'
import { DoneToday } from './DoneToday'
import { ProblemSheet } from './ProblemSheet'
import { RoomCard } from './RoomCard'
import { SummaryLine } from './SummaryLine'

type FlagAction = Extract<Action, { type: 'flag' }>
/** Every flag variant minus type/roomId (distributes over the union so each reason keeps its own fields). */
type FlagExtra = FlagAction extends infer A ? (A extends FlagAction ? Omit<A, 'type' | 'roomId'> : never) : never

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

  // Rooms she can hand off: still to do and planned to end after her shift end (the reducer checks the same).
  const canHandOff = (p: (typeof plan)[number]) => p.room.status === 'todo' && p.end > shiftEnd
  const handOffIds = plan.filter(canHandOff).map((p) => p.room.id)
  const handOff = (roomId: string) => dispatch({ type: 'handOff', roomId })

  // Only open the sheet for a room that is still on this person's list (survives role switches / undo).
  const sheetRoom = plan.some((p) => p.room.id === problemId) ? problemId : null

  const flag = (extra: FlagExtra) => {
    if (!sheetRoom) return
    dispatch({ type: 'flag', roomId: sheetRoom, ...extra })
    setProblemId(null)
  }

  return (
    <div className="pb-8 pt-1">
      {plan.length > 0 && (
        <div className="px-5 pb-5">
          <SummaryLine projection={projection} shiftEnd={shiftEnd} handOffIds={handOffIds} onHandOff={handOff} />
        </div>
      )}

      <Section title="Your rooms · in order">
        {/* The order is calculated (seed lists are pre-sorted); say so, without numbering the cards. */}
        <p className="-mt-1.5 mb-3 text-[13px] text-muted">guest arrivals first, then by floor</p>
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
                onHandOff={canHandOff(p) ? () => handOff(p.room.id) : undefined}
              />
            ))}
          </ul>
        )}
      </Section>

      <DoneToday rooms={done} />

      <ProblemSheet
        key={sheetRoom ?? 'closed'}
        roomId={sheetRoom}
        chips={dndChips(state, housekeeperId)}
        onClose={closeSheet}
        onDnd={(until) => flag({ reason: 'dnd', until })}
        onBroken={(issue) => flag({ reason: 'broken', issue })}
        onBrokenOther={(note) => flag({ reason: 'broken', issue: 'other', note })}
        onDeclined={() => flag({ reason: 'declined' })}
        onNoAccess={() => flag({ reason: 'no_access' })}
        onOther={(note) => flag({ reason: 'other', note })}
      />
    </div>
  )
}
