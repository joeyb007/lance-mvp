import { fmt, ISSUE_LABEL } from '../../domain/format'
import { firstName, MAINTENANCE_NAME } from '../../domain/seed'
import { tickets } from '../../domain/selectors'
import { useStore } from '../../state/store'
import { Button, Card, Pill, RoomChip, Section } from '../../ui'

/** "More" tab: maintenance tickets with Mark fixed (stands in for Sam's side). */
export function MoreScreen() {
  const { state, dispatch } = useStore()
  const list = tickets(state)
  return (
    <div className="pb-6 pt-2">
      <Section title="Maintenance tickets" count={list.length}>
        <p className="mb-3 text-[13px] text-muted">
          Stands in for {MAINTENANCE_NAME}'s side. Marking a ticket fixed puts the room back in the queue.
        </p>
        {list.length === 0 && <Card className="p-4 text-[14px] text-muted">No tickets yet. Housekeepers raise them with Problem → Something's broken.</Card>}
        <div className="space-y-2">
          {list.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 p-3" data-testid={`ticket-${t.roomId}`}>
              <RoomChip id={t.roomId} />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold">{t.note ?? ISSUE_LABEL[t.issue]}</div>
                <div className="text-[13px] text-muted">
                  From {firstName(t.raisedBy)} · {fmt(t.raisedAt)} · to {MAINTENANCE_NAME}
                </div>
              </div>
              {t.fixedAt != null ? (
                <Pill tone="green">Fixed {fmt(t.fixedAt)}</Pill>
              ) : (
                <Button size="md" onClick={() => dispatch({ type: 'markFixed', ticketId: t.id })}>
                  Mark fixed
                </Button>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}
