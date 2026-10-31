import { useState } from 'react'
import { arrivalBadge, cleanLabel } from '../../domain/format'
import { firstName, PEOPLE } from '../../domain/seed'
import { queue } from '../../domain/selectors'
import type { QueueItem } from '../../domain/types'
import { useStore } from '../../state/store'
import { Avatar, Button, Card, Icon, Pill, RoomChip, Section } from '../../ui'
import { WhoTakesSheet } from './WhoTakesSheet'

/**
 * "To assign": only rooms someone can actually take (recommendation `pick`), in `queue()` order.
 * No-one and blocked rooms live in <CantPlace/> below.
 */
export function AssignQueue() {
  const { state, dispatch } = useStore()
  const items = queue(state).filter((i) => i.recommendation?.type === 'pick')
  const [choosing, setChoosing] = useState<string | null>(null)

  return (
    <div data-testid="queue">
      <Section
        title="To assign · most urgent first"
        subtitle="by guest arrival, then how long it's waited"
        className="pb-6"
        right={
          items.length > 0 && (
            <Button size="md" className="shrink-0 whitespace-nowrap" onClick={() => dispatch({ type: 'assignAll' })} data-testid="assign-all">
              Assign all
            </Button>
          )
        }
      >
        {items.length === 0 ? (
          <Card className="flex min-h-12 items-center gap-3 px-4 py-3 text-[14px] text-muted" data-testid="queue-empty">
            <Icon name="check" className="text-accent" />
            Nothing to assign.
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
}

function QueueCard({ item, onChoose }: { item: QueueItem; onChoose: () => void }) {
  const { state, dispatch } = useStore()
  const { room, recommendation: rec, label } = item
  if (rec?.type !== 'pick') return null
  const badge = arrivalBadge(room, state.now)

  return (
    <Card className="scroll-mt-3 p-4" id={`queue-${room.id}`} data-testid={`queue-${room.id}`}>
      <div className="flex items-start gap-3">
        <RoomChip id={room.id} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold leading-snug">{cleanLabel(room)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-[13px] text-muted">{label}</span>
            {/* Neutral on purpose: red is only for "can't be done" (TDD §9). */}
            {badge && <Pill tone="neutral">{badge.text}</Pill>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
        <Avatar initials={PEOPLE[rec.housekeeperId].initials} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug">Best: {firstName(rec.housekeeperId)}</div>
          <div className="text-[13px] leading-snug text-muted">{rec.reason}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" size="md" onClick={() => dispatch({ type: 'assign', roomId: room.id, housekeeperId: rec.housekeeperId })} data-testid={`give-${room.id}`}>
          Give to {firstName(rec.housekeeperId)}
        </Button>
        <Button variant="secondary" size="md" onClick={onChoose} data-testid={`choose-${room.id}`}>
          Someone else
        </Button>
      </div>
    </Card>
  )
}
