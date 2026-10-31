// PLACEHOLDER from Phase 0. Owned by worktree B (feat/supervisor). Replace freely; keep the export name.
import { roomsNeedingAttention } from '../../domain/selectors'
import { useStore } from '../../state/store'

export function SupervisorHome() {
  const { state } = useStore()
  return <div className="px-5 text-[15px]">Rooms needing attention: {roomsNeedingAttention(state)}</div>
}
