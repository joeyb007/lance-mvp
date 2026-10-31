import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Bottom sheet with grabber + ✕. Portaled into #phone-frame so it covers the visible screen
 * even when opened from inside a scrolled <main>.
 */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const target = document.getElementById('phone-frame') ?? document.body
  return createPortal(
    <div className="absolute inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[88%] overflow-y-auto rounded-t-[22px] bg-white px-5 pb-8 pt-2 shadow-2xl animate-[sheet-up_180ms_ease-out]">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[18px] font-bold">{title}</div>
          <button aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-chip text-[18px] text-muted">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    target,
  )
}
