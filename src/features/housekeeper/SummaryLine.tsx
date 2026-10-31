import { fmt } from '../../domain/format'
import type { Minutes, Projection } from '../../domain/types'

const TONE = {
  green: { box: 'bg-accent-soft text-accent', dot: 'bg-accent' },
  amber: { box: 'bg-amber-soft text-amber', dot: 'bg-amber' },
  red: { box: 'bg-danger-soft text-danger', dot: 'bg-danger' },
} as const

const rooms = (n: number) => `${n} room${n === 1 ? '' : 's'}`

/** "5 rooms left · done by 12:40", coloured by the projection status (TDD §7 team colours). */
export function SummaryLine({ projection, shiftEnd }: { projection: Projection; shiftEnd: Minutes }) {
  const { finish, slack, status, roomsLeft } = projection
  const tone = TONE[status]

  let title: string
  let detail: string
  if (status === 'red') {
    title = `On track to finish ${fmt(finish)} · shift ends ${fmt(shiftEnd)}`
    detail = `${rooms(roomsLeft)} left · ${-slack} min over`
  } else {
    title = `${rooms(roomsLeft)} left · done by ${fmt(finish)}`
    detail = slack === 0 ? `Shift ends ${fmt(shiftEnd)} · no time spare` : `Shift ends ${fmt(shiftEnd)} · ${slack} min spare`
  }

  return (
    <div className={`flex items-start gap-2.5 rounded-[14px] px-4 py-3 ${tone.box}`} data-testid="summary" data-status={status}>
      <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0">
        <div className="text-[15px] font-semibold leading-snug">{title}</div>
        <div className="text-[13px] leading-snug opacity-80">{detail}</div>
      </div>
    </div>
  )
}
