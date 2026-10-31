import type { ReactNode } from 'react'

/** Small uppercase section heading with optional count and right-side slot. */
export function Section({ title, count, right, children, className = '' }: { title: string; count?: number; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-5 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold">
          {title}
          {count != null && <span className="ml-1.5 font-semibold text-muted">{count}</span>}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}
