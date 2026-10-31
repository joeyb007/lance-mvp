import type { HTMLAttributes } from 'react'

/** White card, 1px light-grey border, ~14px radius. `tone` tints the border for warnings. */
export function Card({ className = '', tone = 'default', ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: 'default' | 'danger' | 'muted' }) {
  const toneClass = tone === 'danger' ? 'border-danger/40' : tone === 'muted' ? 'border-line bg-chip/60' : 'border-line bg-white'
  return <div className={`rounded-[14px] border ${toneClass} ${className}`} {...rest} />
}
