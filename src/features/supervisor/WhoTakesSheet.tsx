import { cleanLabel } from '../../domain/format'
import { options, recommendation } from '../../domain/selectors'
import { PEOPLE } from '../../domain/seed'
import { useStore } from '../../state/store'
import { Avatar, BottomSheet, Pill, RoomChip } from '../../ui'

/**
 * "Who takes {room}?": every housekeeper with their would-be slot, in the selector's order.
 * Infeasible people are shown greyed out and can't be tapped (rule 6). Picked by time, never by speed.
 */
export function WhoTakesSheet({ roomId, onClose }: { roomId: string | null; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const room = roomId ? state.rooms[roomId] : null
  // The room may have left the queue (e.g. Undo/Assign all elsewhere): render nothing then.
  const open = room != null && state.queue.includes(room.id) && !room.blocked
  const rec = open && room ? recommendation(state, room.id) : null
  const recommendedId = rec?.type === 'pick' ? rec.housekeeperId : undefined

  return (
    <BottomSheet open={open} onClose={onClose} title={room ? `Who takes ${room.id}?` : undefined}>
      {open && room && (
        <div data-testid="who-takes-sheet">
          <div className="mb-3 flex items-center gap-3">
            <RoomChip id={room.id} />
            <span className="text-[14px] text-muted">{cleanLabel(room)}</span>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
            {options(state, room.id).map((o) => {
              const best = o.housekeeperId === recommendedId
              return (
                <li key={o.housekeeperId}>
                  <button
                    disabled={!o.feasible}
                    aria-disabled={!o.feasible}
                    data-testid={`option-${o.housekeeperId}`}
                    onClick={() => {
                      dispatch({ type: 'assign', roomId: room.id, housekeeperId: o.housekeeperId })
                      onClose()
                    }}
                    className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left ${o.feasible ? 'bg-white active:bg-chip' : 'cursor-not-allowed bg-chip/60'}`}
                  >
                    <span className={o.feasible ? '' : 'opacity-40 grayscale'}>
                      <Avatar initials={PEOPLE[o.housekeeperId].initials} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`text-[16px] font-semibold ${o.feasible ? '' : 'text-muted'}`}>{o.name}</span>
                        {best && <Pill tone="green">Best</Pill>}
                        {!o.feasible && <Pill tone="outline">Can't make it</Pill>}
                      </span>
                      <span className={`mt-0.5 block text-[13px] leading-snug ${o.feasible ? 'text-muted' : 'text-muted/80'}`}>{o.reason}</span>
                    </span>
                    {o.feasible && (
                      <span aria-hidden className="text-muted">
                        ›
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[13px] text-muted">The room goes to the end of their list.</p>
        </div>
      )}
    </BottomSheet>
  )
}
