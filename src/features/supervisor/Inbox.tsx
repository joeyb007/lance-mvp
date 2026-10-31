import type { ReactNode } from 'react'
import type { InboxItem } from '../../domain/types'
import { inbox } from '../../domain/selectors'
import { useStore } from '../../state/store'
import { Card, Icon, Section } from '../../ui'

/** Updates inbox, grouped by priority (rule 7): Urgent → Needs a decision → For your info. Never a flat feed. */
export function Inbox({ onSeeQueue, onSeeRoom }: { onSeeQueue: () => void; onSeeRoom: (roomId: string) => void }) {
  const { state } = useStore()
  const { urgent, decision, info } = inbox(state)

  return (
    <Section title="Updates" className="pb-6">
      <div className="space-y-3">
        {/* Urgent: informational only. No-one rooms can't be moved; at-risk rooms have an owner (rule 1). */}
        <Card tone={urgent.length ? 'danger' : 'default'} className="overflow-hidden" data-testid="inbox-urgent">
          <GroupHeader tone="danger" icon="alert" title="Urgent" count={urgent.length} />
          {urgent.length === 0 ? (
            <Empty>Nothing urgent.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {urgent.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-3">
                  <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-danger" />
                  <span className="min-w-0 flex-1">
                    <ItemText item={item} strong />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden" data-testid="inbox-decision">
          <GroupHeader
            tone="ink"
            icon="list"
            title="Needs a decision"
            count={decision.length}
            right={
              decision.length > 0 && (
                <button onClick={onSeeQueue} className="-my-2 -mr-2 flex h-12 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-accent active:bg-accent-soft">
                  See queue <span aria-hidden>›</span>
                </button>
              )
            }
          />
          {decision.length === 0 ? (
            <Empty>Nothing to decide.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {decision.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => (item.roomId ? onSeeRoom(item.roomId) : onSeeQueue())}
                    className="flex min-h-12 w-full items-center gap-2 px-4 py-2.5 text-left active:bg-chip"
                  >
                    <span className="min-w-0 flex-1">
                      <ItemText item={item} />
                    </span>
                    <span aria-hidden className="text-muted">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card tone="muted" className="overflow-hidden" data-testid="inbox-info">
          <GroupHeader tone="muted" icon="check" title="For your info" count={info.length} />
          {info.length === 0 ? (
            <Empty>No updates yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {info.map((item) => (
                <li key={item.id} className="px-4 py-2.5">
                  <ItemText item={item} muted />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Section>
  )
}

const TONE = { danger: 'text-danger', ink: 'text-ink', muted: 'text-muted' } as const

function GroupHeader({ tone, icon, title, count, right }: { tone: keyof typeof TONE; icon: 'alert' | 'list' | 'check'; title: string; count: number; right?: ReactNode }) {
  return (
    <div className={`flex min-h-11 items-center gap-2 px-4 py-2 ${TONE[tone]}`}>
      <Icon name={icon} size={18} className="shrink-0" />
      <h3 className="flex-1 text-[15px] font-bold">
        {title}
        <span className={`ml-1.5 font-semibold ${count > 0 && tone === 'danger' ? '' : 'text-muted'}`}>{count}</span>
      </h3>
      {right}
    </div>
  )
}

function ItemText({ item, strong, muted }: { item: InboxItem; strong?: boolean; muted?: boolean }) {
  return (
    <>
      <div className={`text-[15px] leading-snug ${strong ? 'font-semibold' : 'font-medium'} ${muted ? 'text-ink/80' : 'text-ink'}`}>{item.title}</div>
      {item.subtitle && <div className="mt-0.5 text-[13px] leading-snug text-muted">{item.subtitle}</div>}
    </>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="border-t border-line px-4 py-2.5 text-[13px] text-muted">{children}</p>
}
