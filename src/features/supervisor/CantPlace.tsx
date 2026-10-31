import { fmt, ISSUE_LABEL } from '../../domain/format'
import { queue } from '../../domain/selectors'
import type { Room } from '../../domain/types'
import { useStore } from '../../state/store'
import { Section } from '../../ui'

/**
 * Below the queue: rooms no one can place. No-one rooms get one calm line with a red dot and no button (rule 6);
 * rooms waiting on maintenance get a muted grey line. Which room is which comes from `queue()`.
 */
export function CantPlace() {
  const { state } = useStore()
  const items = queue(state)
  const noOne = items.filter((i) => i.recommendation?.type === 'no-one')
  const blocked = items.filter((i) => i.recommendation === null)
  if (noOne.length === 0 && blocked.length === 0) return null

  return (
    <Section title={noOne.length > 0 ? "Can't be placed" : 'Waiting on a fix'} className="pb-6">
      <ul className="space-y-2" data-testid="cant-place">
        {noOne.map(({ room }) => (
          <li
            key={room.id}
            id={`cant-${room.id}`}
            data-testid={`cant-${room.id}`}
            className="flex min-h-12 scroll-mt-3 items-start gap-3 rounded-[14px] border border-line bg-white px-4 py-3"
          >
            <span aria-hidden data-danger="cant" className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-danger" />
            <p className="text-[14px] leading-snug text-ink">
              <span className="font-bold">{room.id}</span> · {deadlineText(room)} · <span className="text-muted">let the front desk know</span>
            </p>
          </li>
        ))}
        {blocked.map(({ room }) => {
          const ticket = state.tickets.find((t) => t.id === room.ticketId)
          return (
            <li
              key={room.id}
              id={`blocked-${room.id}`}
              data-testid={`blocked-${room.id}`}
              className="flex min-h-12 scroll-mt-3 items-start gap-3 rounded-[14px] bg-chip/70 px-4 py-3"
            >
              <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-muted/50" />
              <p className="text-[14px] leading-snug text-muted">
                <span className="font-bold text-ink/70">{room.id}</span> · waiting on maintenance · {ticket ? ISSUE_LABEL[ticket.issue] : 'Broken'}.{' '}
                Mark fixed under More.
              </p>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function deadlineText(room: Room): string {
  return room.arrival != null ? `can't be ready for the ${fmt(room.arrival)} arrival` : "can't be finished before shift end"
}
