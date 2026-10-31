import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ISSUE_LABEL } from '../../domain/format'
import { SUPERVISOR_NAME } from '../../domain/seed'
import type { DndChip, Issue } from '../../domain/types'
import { BottomSheet, Button } from '../../ui'

const ISSUES: Issue[] = ['light', 'leak', 'ac', 'tv', 'other']

interface Props {
  roomId: string | null
  chips: DndChip[]
  onClose: () => void
  onDnd: (until: number) => void
  onBroken: (issue: Issue) => void
  onDeclined: () => void
}

function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-center rounded-full border border-line bg-white px-2 text-[15px] font-semibold tabular-nums active:bg-chip"
    >
      {children}
    </button>
  )
}

/**
 * The one-step Problem sheet (TDD §5): always 2 taps, Problem → option.
 * Rendered through a portal into the phone frame so it covers the whole screen and isn't
 * pinned to the top of the scrolling <main> (BottomSheet is `absolute inset-0`).
 */
export function ProblemSheet({ roomId, chips, onClose, onDnd, onBroken, onDeclined }: Props) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [frame, setFrame] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    // <main> sits directly inside the phone frame (relative, overflow-hidden).
    setFrame(anchor.current?.closest('main')?.parentElement ?? null)
  }, [])

  const sheet = (
    <BottomSheet open={roomId != null} onClose={onClose} title={`${roomId} · What's the problem?`}>
      <h3 className="mb-2 text-[14px] font-semibold">Do not disturb · come back at</h3>
      <div className="grid grid-cols-4 gap-2">
        {chips.map((c) => (
          <Chip key={c.label} onClick={() => onDnd(c.until)}>
            {c.label}
          </Chip>
        ))}
      </div>
      {chips.some((c) => c.later) && (
        <p className="mt-1.5 text-[12px] text-muted">Later = can't get back to it today · goes to {SUPERVISOR_NAME}</p>
      )}

      <h3 className="mb-2 mt-5 text-[14px] font-semibold">Something's broken</h3>
      <div className="grid grid-cols-4 gap-2">
        {ISSUES.map((i) => (
          <Chip key={i} onClick={() => onBroken(i)}>
            {ISSUE_LABEL[i]}
          </Chip>
        ))}
      </div>

      <Button variant="secondary" size="lg" block className="mt-6" onClick={onDeclined}>
        Guest declined service
      </Button>
    </BottomSheet>
  )

  return (
    <>
      <span ref={anchor} hidden />
      {frame ? createPortal(sheet, frame) : sheet}
    </>
  )
}
