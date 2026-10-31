import type { ReactNode } from 'react'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

/** Lance header: initials avatar (tap → name picker) + bold title + bell. */
export function Header({ initials, title, onAvatar, right }: { initials: string; title: string; onAvatar: () => void; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-5 pb-3 pt-4">
      <button onClick={onAvatar} aria-label="Switch person" className="rounded-full">
        <Avatar initials={initials} size={40} />
      </button>
      <h1 className="flex-1 text-[22px] font-bold tracking-tight">{title}</h1>
      {right}
      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-chip text-ink">
        <Icon name="bell" />
      </span>
    </header>
  )
}
