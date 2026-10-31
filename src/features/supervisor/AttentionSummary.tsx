import { useState } from 'react'
import { attention, type AttentionKind, type AttentionRow } from '../../domain/selectors'
import { useStore } from '../../state/store'
import { Card, Icon } from '../../ui'

// Colour rule (TDD §9): red only for "can't be done". Late is amber, waiting on a fix is grey, the rest have no dot.
const DOT: Record<AttentionKind, string | null> = {
  cant: 'bg-danger',
  late: 'bg-amber',
  assign: null,
  waiting: 'bg-muted/50',
  info: null,
}

function Dot({ kind }: { kind: AttentionKind }) {
  const tone = DOT[kind]
  if (!tone) return null
  return <span aria-hidden data-danger={kind === 'cant' ? 'cant' : undefined} className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
}

/**
 * One collapsible line in place of the old headline + inbox cards: "3 need attention · ● 1 can't be done · ● 1 late · 1 to assign".
 * Collapsed by default; expands into one list in priority order (rule 7), straight from `attention()`.
 */
export function AttentionSummary({ onGo }: { onGo: (row: AttentionRow) => void }) {
  const { state } = useStore()
  const { total, counts, rows } = attention(state)
  const [open, setOpen] = useState(false)

  const segments = (
    [
      ['cant', counts.cant, `${counts.cant} can't be done`],
      ['late', counts.late, `${counts.late} late`],
      ['assign', counts.assign, `${counts.assign} to assign`],
      ['waiting', counts.waiting, `${counts.waiting} waiting on a fix`],
    ] as const
  ).filter(([, n]) => n > 0)

  const actions = rows.filter((r) => r.kind !== 'info')
  const info = rows.filter((r) => r.kind === 'info')

  return (
    <div className="px-5 pb-5 pt-1">
      <Card className="overflow-hidden" data-testid="attention-summary">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="attention-list"
          data-testid="attention-toggle"
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-chip"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {total > 0 ? (
              <span className="text-[17px] font-bold leading-snug whitespace-nowrap">
                <span data-testid="needing-attention" className="tabular-nums">
                  {total}
                </span>{' '}
                {total === 1 ? 'needs' : 'need'} attention
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[17px] font-bold leading-snug text-accent">
                <Icon name="check" size={18} />
                Nothing needs attention
              </span>
            )}
            {segments.length > 0 && (
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-medium text-ink/70" data-testid="attention-segments">
                {segments.map(([kind, , text], i) => (
                  // Separator trails its segment, so a wrapped line never starts with a stray "·".
                  <span key={kind} className="flex items-center gap-1.5 whitespace-nowrap">
                    <Dot kind={kind} />
                    {text}
                    {i < segments.length - 1 && <span className="text-muted">·</span>}
                  </span>
                ))}
              </span>
            )}
          </span>
          {rows.length > 0 && (
            <span aria-hidden className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
              <Chevron />
            </span>
          )}
        </button>

        {open && rows.length > 0 && (
          <div id="attention-list" data-testid="attention-list" className="border-t border-line">
            {actions.length > 0 && (
              <ul className="divide-y divide-line">
                {actions.map((row) => (
                  <li key={row.id}>
                    <button onClick={() => onGo(row)} data-testid={`attention-${row.id}`} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-chip">
                      <span className="flex w-2 shrink-0 justify-center">
                        <Dot kind={row.kind} />
                      </span>
                      <RowText row={row} />
                      <span aria-hidden className="shrink-0 text-[18px] text-muted">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {info.length > 0 && (
              <div className={actions.length > 0 ? 'border-t border-line' : ''}>
                <div className="px-4 pb-0.5 pt-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">For your info</div>
                <ul>
                  {info.map((row) => (
                    <li key={row.id} data-testid={`attention-${row.id}`} className="flex min-h-12 items-center gap-3 px-4 py-2">
                      <span className="w-2 shrink-0" />
                      <RowText row={row} muted />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function RowText({ row, muted }: { row: AttentionRow; muted?: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={`block text-[14px] font-semibold leading-snug ${muted ? 'text-ink/75' : 'text-ink'}`}>{row.title}</span>
      {row.subtitle && <span className="block text-[12.5px] leading-snug text-muted">{row.subtitle}</span>}
    </span>
  )
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
