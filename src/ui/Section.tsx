import type { ReactNode } from 'react'

/** Section heading with optional count, muted subtitle and right-side slot. */
export function Section({ title, subtitle, count, right, children, className = '' }: { title: string; subtitle?: string; count?: number; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`px-5 ${className}`}>
      <div className={`mb-2 flex justify-between gap-3 ${subtitle ? 'items-center' : 'items-baseline'}`}>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold">
            {title}
            {count != null && <span className="ml-1.5 font-semibold text-muted">{count}</span>}
          </h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}
