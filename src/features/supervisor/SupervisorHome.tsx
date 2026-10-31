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

  return (
    <div data-testid="supervisor">
      <Headline />
      <Inbox onSeeQueue={seeQueue} />
      <AssignQueue ref={queueRef} />
      <Team />
    </div>
  )
}
