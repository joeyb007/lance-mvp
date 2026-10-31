import { fmt } from '../../domain/format'
import type { Minutes, Projection } from '../../domain/types'

// Running over shift end is a warning she can act on (hand the room off), not an alarm: amber, never red.
const TONE = {
  green: { box: 'bg-accent-soft text-accent', dot: 'bg-accent' },
  amber: { box: 'bg-amber-soft text-amber', dot: 'bg-amber' },
} as const

const rooms = (n: number) => `${n} room${n === 1 ? '' : 's'}`

interface Props {
  projection: Projection
  shiftEnd: Minutes
  /** Rooms planned to end after shift end that she can hand off (todo). Normally one. */
  handOffIds: string[]
  onHandOff: (roomId: string) => void
}

/** "5 rooms left · done by 12:40", or "On track to finish 1:05 · 5 min over" with a Hand off button per late room. */
export function SummaryLine({ projection, shiftEnd, handOffIds, onHandOff }: Props) {
  const { finish, slack, status, roomsLeft } = projection
  const over = slack < 0
  const tone = TONE[status === 'green' ? 'green' : 'amber']

  let title: string
  let detail: string
  if (over) {
    title = `On track to finish ${fmt(finish)} · ${-slack} min over`
    detail = `${rooms(roomsLeft)} left · shift ends ${fmt(shiftEnd)}`
  } else {
    title = `${rooms(roomsLeft)} left · done by ${fmt(finish)}`
    detail = slack === 0 ? `Shift ends ${fmt(shiftEnd)} · no time spare` : `Shift ends ${fmt(shiftEnd)} · ${slack} min spare`
  }

  return (
    <div className={`rounded-[14px] px-4 py-3 ${tone.box}`} data-testid="summary" data-status={status}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug">{title}</div>
          <div className="text-[13px] leading-snug opacity-80">{detail}</div>
        </div>
      </div>
      {over && handOffIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pl-[18px]">
          {handOffIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onHandOff(id)}
              data-testid={`summary-handoff-${id}`}
              className="inline-flex h-12 items-center justify-center rounded-full border border-amber/30 bg-white px-5 text-[15px] font-semibold text-ink active:bg-amber-soft"
            >
              Hand off {id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
