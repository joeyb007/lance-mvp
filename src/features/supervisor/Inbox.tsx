import type { ReactNode } from 'react'
import type { InboxItem } from '../../domain/types'
import { inbox } from '../../domain/selectors'
import { useStore } from '../../state/store'
import { Card, Icon, Section } from '../../ui'

/** Updates inbox, grouped by priority (rule 7): Urgent → Needs a decision → For your info. Never a flat feed. */
export function Inbox({ onSeeQueue }: { onSeeQueue: () => void }) {
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

        {/* Needs a decision: one line, not a second copy of the queue that sits right below. */}
        <Card className="overflow-hidden" data-testid="inbox-decision">
          {decision.length === 0 ? (
            <>
              <GroupHeader tone="ink" icon="list" title="Needs a decision" count={0} />
              <Empty>Nothing to decide.</Empty>
            </>
          ) : (
            <button onClick={onSeeQueue} className="flex min-h-14 w-full items-center gap-2 px-4 py-2 text-left active:bg-chip">
              <Icon name="list" size={18} className="shrink-0" />
              <span className="flex-1 text-[15px] font-bold">
                Needs a decision <span className="ml-1 font-semibold text-muted">{decision.length}</span>
                <span className="block text-[13px] font-medium text-muted">
                  {decision.length === 1 ? '1 room' : `${decision.length} rooms`} to assign
                </span>
              </span>
              <span className="text-[14px] font-semibold text-accent">See queue ›</span>
            </button>
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
