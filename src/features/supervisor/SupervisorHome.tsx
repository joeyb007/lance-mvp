// Supervisor screen: one scrolling page, TDD §3/§4.
// Summary line (collapsed; expands into one list in priority order) → To assign → Can't be placed → Team.
// Everything is read from selectors; nothing here ranks, recommends or checks feasibility itself.
import type { AttentionRow } from '../../domain/selectors'
import { AssignQueue } from './AssignQueue'
import { AttentionSummary } from './AttentionSummary'
import { CantPlace } from './CantPlace'
import { Team } from './Team'

/** Where each summary row lives on the page. For-your-info rows don't go anywhere. */
function targetId(row: AttentionRow): string | null {
  switch (row.kind) {
    case 'cant':
      return `cant-${row.roomId}`
    case 'late':
      return `team-${row.housekeeperId}`
    case 'assign':
      return `queue-${row.roomId}`
    case 'waiting':
      return `blocked-${row.roomId}`
    default:
      return null
  }
}

function go(row: AttentionRow) {
  const id = targetId(row)
  const el = id ? document.getElementById(id) : null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Brief accent ring so the eye lands on the right item.
  el.animate?.([{ boxShadow: 'inset 0 0 0 2px #2F6F5E' }, { boxShadow: 'inset 0 0 0 2px transparent' }], { duration: 1600, easing: 'ease-out' })
}

export function SupervisorHome() {
  return (
    <div data-testid="supervisor">
      <AttentionSummary onGo={go} />
      <AssignQueue />
      <CantPlace />
      <Team />
    </div>
  )
}
