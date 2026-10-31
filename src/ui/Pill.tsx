import type { ReactNode } from 'react'

export type PillTone = 'neutral' | 'green' | 'amber' | 'red' | 'dark' | 'outline'

const TONES: Record<PillTone, string> = {
  neutral: 'bg-chip text-ink',
  green: 'bg-accent-soft text-accent',
  amber: 'bg-amber-soft text-amber',
  red: 'bg-danger-soft text-danger',
  dark: 'bg-ink text-white',
  outline: 'bg-white text-muted border border-line',
}

/** Small status label ("In progress", "Guest arrives 11:00", "From Jordan"). Not a button. */
export function Pill({ tone = 'neutral', children, className = '' }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
