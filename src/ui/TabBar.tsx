import { Icon, type IconName } from './Icon'

export interface Tab {
  id: string
  label: string
  icon: IconName
  inert?: boolean
}

/** Bottom tab bar. Inert tabs (Messages) render but do nothing. */
export function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <nav className="flex border-t border-line bg-white pb-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => !t.inert && onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${active === t.id ? 'text-ink' : 'text-muted'} ${t.inert ? 'opacity-60' : ''}`}
        >
          <Icon name={t.icon} size={22} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
