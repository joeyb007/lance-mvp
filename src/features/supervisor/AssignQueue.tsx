import { forwardRef, useState } from 'react'
import { arrivalBadge, cleanLabel } from '../../domain/format'
import { firstName, PEOPLE } from '../../domain/seed'
import { queue } from '../../domain/selectors'
import type { QueueItem } from '../../domain/types'
import { useStore } from '../../state/store'
import { Avatar, Button, Card, Icon, Pill, RoomChip, Section } from '../../ui'
import { WhoTakesSheet } from './WhoTakesSheet'

/** Assignment queue: order, recommendations and feasibility all come from `queue()` (blocked rooms last). */
export const AssignQueue = forwardRef<HTMLDivElement>(function AssignQueue(_, ref) {
  const { state, dispatch } = useStore()
  const items = queue(state)
  const [choosing, setChoosing] = useState<string | null>(null)
  const canAssignAny = items.some((i) => i.recommendation?.type === 'pick')

  return (
    <div ref={ref} className="scroll-mt-2" data-testid="queue">
      <Section
        title="To assign"
        count={items.length}
        className="pb-6"
        right={
          items.length > 0 && (
            <Button size="md" disabled={!canAssignAny} onClick={() => dispatch({ type: 'assignAll' })} data-testid="assign-all">
              Assign all
            </Button>
          )
        }
      >
        {items.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-[14px] text-muted" data-testid="queue-empty">
            <Icon name="check" className="text-accent" />
            Nothing to assign. Every room has someone.
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.room.id}>
                <QueueCard item={item} onChoose={() => setChoosing(item.room.id)} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      <WhoTakesSheet roomId={choosing} onClose={() => setChoosing(null)} />
    </div>
  )
})

function QueueCard({ item, onChoose }: { item: QueueItem; onChoose: () => void }) {
  const { state, dispatch } = useStore()
  const { room, recommendation: rec, label } = item
  const badge = arrivalBadge(room, state.now)
  const blocked = rec === null

  return (
    <Card tone={blocked ? 'muted' : rec.type === 'no-one' ? 'danger' : 'default'} className="scroll-mt-2 p-4" id={`queue-${room.id}`} data-testid={`queue-${room.id}`}>
      <div className="flex items-start gap-3">
        <RoomChip id={room.id} />
        <div className="min-w-0 flex-1">
          <div className={`text-[16px] font-semibold leading-snug ${blocked ? 'text-ink/70' : ''}`}>{cleanLabel(room)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-[13px] text-muted">{label}</span>
            {badge && <Pill tone={badge.urgent ? 'red' : 'neutral'}>{badge.text}</Pill>}
          </div>
        </div>
      </div>

      {blocked ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-white px-3 py-2.5 text-[13px] leading-snug text-muted">
          <Icon name="wrench" size={18} className="mt-px shrink-0" />
          <span>
            <span className="font-semibold text-ink/80">Waiting on maintenance.</span> Mark fixed under More → Maintenance tickets.
          </span>
        </div>
      ) : rec.type === 'no-one' ? (
        // Deliberately no button (rule 6): nobody can make it, so we say so.
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-soft px-3 py-2.5 text-[14px] leading-snug text-danger" role="alert">
          <Icon name="alert" size={18} className="mt-px shrink-0" />
          <span>
            <span className="font-semibold">{rec.reason}</span> Let the front desk know.
          </span>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
            <Avatar initials={PEOPLE[rec.housekeeperId].initials} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Best: {firstName(rec.housekeeperId)}</div>
              <div className="text-[13px] leading-snug text-muted">{rec.reason}</div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Button block size="lg" onClick={() => dispatch({ type: 'assign', roomId: room.id, housekeeperId: rec.housekeeperId })} data-testid={`give-${room.id}`}>
              Give to {firstName(rec.housekeeperId)}
            </Button>
            <Button block variant="secondary" size="md" onClick={onChoose} data-testid={`choose-${room.id}`}>
              Choose someone else
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
