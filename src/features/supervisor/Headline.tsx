import { lateRooms, queue, roomsNeedingAttention } from '../../domain/selectors'
import { useStore } from '../../state/store'

/** "Rooms needing attention" big number + what it's made of. */
export function Headline() {
  const { state } = useStore()
  const total = roomsNeedingAttention(state)
  const items = queue(state)

  const noOne = items.filter((i) => i.recommendation?.type === 'no-one').length
  const toAssign = items.filter((i) => i.recommendation?.type === 'pick').length
  const waiting = items.filter((i) => i.recommendation === null).length
  const late = lateRooms(state).length

  const parts = [
    noOne > 0 && { text: `${noOne} can't be done in time`, danger: true },
    toAssign > 0 && { text: `${toAssign} to assign`, danger: false },
    late > 0 && { text: `${late} running late`, danger: true },
    waiting > 0 && { text: `${waiting} waiting on maintenance`, danger: false },
  ].filter((p): p is { text: string; danger: boolean } => Boolean(p))

  return (
    <div className="px-5 pb-5 pt-1" data-testid="headline">
      <div className="flex items-baseline gap-3">
        <span className={`text-[44px] font-bold leading-none tabular-nums ${total > 0 ? 'text-ink' : 'text-accent'}`} data-testid="needing-attention">
          {total}
        </span>
        <span className="text-[16px] font-semibold leading-tight">{total === 1 ? 'Room needing attention' : 'Rooms needing attention'}</span>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-muted">
        {parts.length === 0
          ? 'Every room is on track.'
          : parts.map((p, i) => (
              <span key={p.text}>
                {i > 0 && ' · '}
                <span className={p.danger ? 'font-semibold text-danger' : ''}>{p.text}</span>
              </span>
            ))}
      </p>
    </div>
  )
}
