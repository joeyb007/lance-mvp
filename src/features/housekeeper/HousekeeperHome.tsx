// PLACEHOLDER from Phase 0. Owned by worktree A (feat/housekeeper). Replace freely; keep the export name + props.
import { roomsFor } from '../../domain/selectors'
import type { HousekeeperId } from '../../domain/types'
import { useStore } from '../../state/store'

export function HousekeeperHome({ housekeeperId }: { housekeeperId: HousekeeperId }) {
  const { state } = useStore()
  return (
    <ul className="px-5 text-[15px]">
      {roomsFor(state, housekeeperId).map((p) => (
        <li key={p.room.id}>{p.room.id}</li>
      ))}
    </ul>
  )
}
