import { useState, type FormEvent, type ReactNode } from 'react'
import { ISSUE_LABEL } from '../../domain/format'
import { NOTE_MAX } from '../../domain/reducer'
import { MAINTENANCE_NAME, SUPERVISOR_NAME } from '../../domain/seed'
import type { DndChip, Issue } from '../../domain/types'
import { BottomSheet, Button } from '../../ui'

// 'tv' stays in the Issue type but isn't offered: a TV problem goes through Something's broken → Other….
const ISSUES: Exclude<Issue, 'other'>[] = ['light', 'leak', 'ac']

/** Which "Other…" she tapped: the note goes to maintenance (a ticket) or to the supervisor (the queue). */
type Typing = 'broken' | 'cant_clean'
const TYPING_HEADING: Record<Typing, string> = {
  broken: `Something's broken · tell maintenance`,
  cant_clean: `Can't clean it · tell ${SUPERVISOR_NAME}`,
}
const TYPING_HINT: Record<Typing, string> = {
  broken: `${MAINTENANCE_NAME} gets a ticket · the room waits until it's fixed`,
  cant_clean: `Goes to ${SUPERVISOR_NAME} · they'll pick someone`,
}

interface Props {
  roomId: string | null
  chips: DndChip[]
  onClose: () => void
  onDnd: (until: number) => void
  onBroken: (issue: Exclude<Issue, 'other'>) => void
  onBrokenOther: (note: string) => void
  onDeclined: () => void
  onNoAccess: () => void
  onOther: (note: string) => void
}

/** Soft rectangle, 52px, equal widths in a 4-column grid. Two-line labels wrap centered. Pressed = black. */
function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      data-chip
      onClick={onClick}
      className="flex h-[52px] min-w-0 items-center justify-center rounded-[12px] border border-line bg-white px-1 text-center text-balance text-[14px] font-semibold leading-[1.15] tabular-nums active:border-ink active:bg-ink active:text-white"
    >
      {children}
    </button>
  )
}

function Group({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 text-[14px] font-semibold">{label}</h3>
      <div className="grid grid-cols-4 gap-2">{children}</div>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </section>
  )
}

/** "Other…": the only place in the app she can type. One short line; the keyboard mic works too. */
function OtherForm({ typing, onBack, onSend }: { typing: Typing; onBack: () => void; onSend: (note: string) => void }) {
  const [text, setText] = useState('')
  const ready = text.trim().length > 0
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) onSend(text.trim())
  }
  return (
    <form onSubmit={submit}>
      <button type="button" onClick={onBack} className="-ml-2 mb-2 flex h-12 items-center gap-1 rounded-full px-2 text-[15px] font-semibold text-muted active:bg-chip">
        <span aria-hidden className="text-[20px] leading-none">‹</span> Back
      </button>
      <h3 className="text-[15px] font-semibold" data-testid="other-heading">
        {TYPING_HEADING[typing]}
      </h3>
      <p className="mb-3 text-[13px] text-muted">{TYPING_HINT[typing]}</p>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={NOTE_MAX}
        placeholder="What's going on?"
        enterKeyHint="send"
        aria-label="What's going on?"
        className="h-[52px] w-full rounded-[12px] border border-line bg-white px-4 text-[16px] outline-none placeholder:text-muted focus:border-ink"
      />
      <p className="mt-1.5 text-[12px] text-muted">Tip: you can use the keyboard mic</p>
      <Button type="submit" size="lg" block className="mt-5" disabled={!ready}>
        Send
      </Button>
    </form>
  )
}

/**
 * The Problem sheet (TDD §5): Problem → option, 2 taps, except "Other…" which asks for one short line.
 * Mount with key={roomId} so "Other…" resets per room.
 */
export function ProblemSheet({ roomId, chips, onClose, onDnd, onBroken, onBrokenOther, onDeclined, onNoAccess, onOther }: Props) {
  const [typing, setTyping] = useState<Typing | null>(null)
  return (
    <BottomSheet open={roomId != null} onClose={onClose} title={`${roomId} · What's the problem?`}>
      {typing ? (
        <OtherForm typing={typing} onBack={() => setTyping(null)} onSend={typing === 'broken' ? onBrokenOther : onOther} />
      ) : (
        <>
          <Group
            label="Guest asked me to come back"
            hint={chips.some((c) => c.later) ? `Later = can't get back to it today · goes to ${SUPERVISOR_NAME}` : undefined}
          >
            {chips.map((c) => (
              <Chip key={c.label} onClick={() => onDnd(c.until)}>
                {c.label}
              </Chip>
            ))}
          </Group>

          <Group label="Something's broken">
            {ISSUES.map((i) => (
              <Chip key={i} onClick={() => onBroken(i)}>
                {ISSUE_LABEL[i]}
              </Chip>
            ))}
            <Chip onClick={() => setTyping('broken')}>Other…</Chip>
          </Group>

          <Group label="Can't clean it">
            <Chip onClick={onDeclined}>Guest declined</Chip>
            <Chip onClick={onNoAccess}>Can't get in</Chip>
            <Chip onClick={() => setTyping('cant_clean')}>Other…</Chip>
          </Group>
        </>
      )}
    </BottomSheet>
  )
}
