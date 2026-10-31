// Supervisor screen (worktree B): one scrolling page, TDD §3/§4.
// Headline → Updates inbox (grouped by priority) → assignment queue → team finish times.
// Everything is read from selectors; nothing here ranks, recommends or checks feasibility itself.
import { useRef } from 'react'
import { AssignQueue } from './AssignQueue'
import { Headline } from './Headline'
import { Inbox } from './Inbox'
import { Team } from './Team'

export function SupervisorHome() {
  const queueRef = useRef<HTMLDivElement>(null)

  const seeQueue = () => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const seeRoom = (roomId: string) => {
    const card = document.getElementById(`queue-${roomId}`)
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else seeQueue()
  }

  return (
    <div data-testid="supervisor">
      <Headline />
      <Inbox onSeeQueue={seeQueue} onSeeRoom={seeRoom} />
      <AssignQueue ref={queueRef} />
      <Team />
    </div>
  )
}
