import { cleanLabel, fmt } from '../../domain/format'
import type { Room } from '../../domain/types'
import { Icon, Pill, RoomChip, Section } from '../../ui'

/** Muted, compact list of rooms finished today (from doneFor, most recent first). */
export function DoneToday({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) return null
  return (
    <Section title="Done today" count={rooms.length} className="mt-6">
      <ul className="space-y-2" data-testid="done-today">
        {rooms.map((room) => (
          <li key={room.id} data-testid={`done-${room.id}`} className="flex items-center gap-3 rounded-[14px] border border-line bg-chip/50 px-3 py-2.5">
            <span className="opacity-60">
              <RoomChip id={room.id} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-snug text-muted">{cleanLabel(room)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-1 text-[13px] font-semibold text-accent tabular-nums">
                  <Icon name="check" size={15} />
                  Done {room.doneAt != null ? fmt(room.doneAt) : ''}
                </span>
                {room.simulated && <Pill tone="outline">done · simulated</Pill>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
