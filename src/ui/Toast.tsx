import { useEffect } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const SHOW_MS = 6000

/** Black toast at the top of the phone: ✓, bold title, grey subtitle, Undo on the right. Driven by state.toast. */
export function Toast() {
  const { state, dispatch } = useStore()
  const toast = state.toast

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dispatch({ type: 'dismissToast' }), SHOW_MS)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

  if (!toast) return null
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-50 flex justify-center" role="status" aria-live="polite">
      <div key={toast.id} className="pointer-events-auto flex w-full items-center gap-3 rounded-[16px] bg-[#111] px-4 py-3 text-white shadow-xl animate-[toast-in_160ms_ease-out]">
        <Icon name="check" size={18} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[15px] font-semibold leading-tight">{toast.title}</div>
          {toast.subtitle && <div className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-white/60">{toast.subtitle}</div>}
        </div>
        {toast.undoable && (
          <button onClick={() => dispatch({ type: 'undo' })} className="h-10 shrink-0 rounded-full px-3 text-[15px] font-semibold text-white underline-offset-2 active:bg-white/10">
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
