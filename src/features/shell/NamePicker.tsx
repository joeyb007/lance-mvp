import { PEOPLE } from '../../domain/seed'
import type { PersonId } from '../../domain/types'
import { Avatar } from '../../ui'

const ORDER: PersonId[] = ['jordan', 'maya', 'priya', 'rosa']

/** Lance's familiar "Who are you?" list, used as the role switch (no PIN). */
export function NamePicker({ current, onPick }: { current?: PersonId; onPick: (id: PersonId) => void }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
      {ORDER.map((id) => (
        <li key={id}>
          <button onClick={() => onPick(id)} className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-chip ${current === id ? 'bg-chip' : 'bg-white'}`}>
            <Avatar initials={PEOPLE[id].initials} />
            <span className="flex-1">
              <span className="block text-[16px] font-semibold">{PEOPLE[id].name}</span>
              <span className="block text-[13px] capitalize text-muted">{PEOPLE[id].role}</span>
            </span>
            <span className="text-muted">›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
