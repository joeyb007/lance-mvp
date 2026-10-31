// Domain types and the FROZEN store contract (TDD §10).
// Phase 1 agents must not edit this file. Missing something? Stub locally + note it in CHANGES.md.

/** Minutes since midnight. 10:30 AM = 630. */
export type Minutes = number

export type HousekeeperId = 'maya' | 'priya' | 'rosa'
export type PersonId = HousekeeperId | 'jordan'

export type CleanType = 'stayover' | 'checkout'
export type Issue = 'light' | 'leak' | 'ac' | 'tv' | 'other'

export type RoomStatus = 'todo' | 'in_progress' | 'done' | 'declined'

/** Why a room is sitting in the assignment queue. */
export type QueueReason = 'unassigned' | 'dnd' | 'broken' | 'handoff' | 'no_access' | 'other'

export interface Room {
  id: string
  floor: number
  clean: CleanType
  suite: boolean
  /** Next guest's arrival time, if any. The room must be ready before this. */
  arrival?: Minutes
  status: RoomStatus
  /** null = in the queue (or declined). */
  ownerId: HousekeeperId | null
  startedAt?: Minutes
  doneAt?: Minutes
  /** Completed by Skip ahead, not by a tap. */
  simulated?: boolean
  /** Can't start before this (DND come-back time). Also the queue's earliestStart. */
  availableAt?: Minutes
  /** Handed over by the supervisor ("From Jordan"). */
  fromSupervisor?: boolean
  /** Broken and not yet fixed: no recommendation, excluded from Assign all. */
  blocked?: boolean
  ticketId?: string
  /** Set while in the queue. */
  queueReason?: QueueReason
  queuedAt?: Minutes
  /** Who flagged it (for "Rosa flagged" / declines). */
  flaggedBy?: HousekeeperId
  /** Her own words, from "Other…" on the Problem sheet (the only typed input). Max 80 chars. */
  note?: string
}

export interface Housekeeper {
  id: HousekeeperId
  name: string
  shiftStart: Minutes
  shiftEnd: Minutes
  /** Floor they're currently on (updated when a room starts / completes). */
  floor: number
  /** Ordered ids of OPEN rooms (todo or in_progress). Done rooms leave the list. */
  list: string[]
}

export interface Ticket {
  id: string
  roomId: string
  issue: Issue
  raisedBy: HousekeeperId
  raisedAt: Minutes
  assignee: 'sam'
  fixedAt?: Minutes
  /** Her own words when the issue is 'other' (Something's broken → Other…). */
  note?: string
}

/** Explicit event log. Feeds the inbox's "For your info" group. */
export type DomainEvent =
  | { id: string; at: Minutes; kind: 'dnd_absorbed'; roomId: string; by: HousekeeperId; until: Minutes }
  | { id: string; at: Minutes; kind: 'dnd_escalated'; roomId: string; by: HousekeeperId; until: Minutes }
  | { id: string; at: Minutes; kind: 'declined'; roomId: string; by: HousekeeperId }
  | { id: string; at: Minutes; kind: 'ticket_raised'; roomId: string; by: HousekeeperId; ticketId: string; issue: Issue; note?: string }
  | { id: string; at: Minutes; kind: 'ticket_fixed'; roomId: string; ticketId: string }
  | { id: string; at: Minutes; kind: 'assigned'; roomId: string; to: HousekeeperId }
  /** The owner sent a room that would run past her shift end to the queue (available now). */
  | { id: string; at: Minutes; kind: 'handed_off'; roomId: string; by: HousekeeperId }
  /** "Can't get in" / "Other…": straight to the queue, available now. */
  | { id: string; at: Minutes; kind: 'escalated'; roomId: string; by: HousekeeperId; reason: 'no_access' | 'other'; note?: string }

export interface Toast {
  /** Increments every time, so the UI can re-show the same text. */
  id: number
  title: string
  subtitle?: string
  undoable: boolean
}

/** Everything except the undo slot itself. */
export interface Snapshot {
  now: Minutes
  role: PersonId
  rooms: Record<string, Room>
  housekeepers: Record<HousekeeperId, Housekeeper>
  /** Room ids with no owner, in arrival order into the queue. */
  queue: string[]
  tickets: Ticket[]
  events: DomainEvent[]
  toast: Toast | null
  seq: number
}

export interface State extends Snapshot {
  /** One-level undo: the full state before the last undoable action. */
  undo: Snapshot | null
}

export type Action =
  | { type: 'start'; roomId: string }
  | { type: 'complete'; roomId: string }
  | { type: 'flag'; roomId: string; reason: 'dnd'; until: Minutes }
  | { type: 'flag'; roomId: string; reason: 'declined' }
  | { type: 'flag'; roomId: string; reason: 'broken'; issue: Exclude<Issue, 'other'> }
  /** Something's broken → Other…: a ticket with her note. Rejected when the trimmed note is empty. */
  | { type: 'flag'; roomId: string; reason: 'broken'; issue: 'other'; note: string }
  | { type: 'flag'; roomId: string; reason: 'no_access' }
  /** The only typed input in the app. Rejected when the trimmed note is empty; capped at 80 chars. */
  | { type: 'flag'; roomId: string; reason: 'other'; note: string }
  /** Owner hands off a todo room whose planned end is after her shift end → queue, available now. */
  | { type: 'handOff'; roomId: string }
  | { type: 'assign'; roomId: string; housekeeperId: HousekeeperId }
  | { type: 'assignAll' }
  | { type: 'undo' }
  | { type: 'markFixed'; ticketId: string }
  | { type: 'advanceClock'; minutes: number }
  | { type: 'setRole'; personId: PersonId }
  | { type: 'dismissToast' }
  | { type: 'reset' }

// ---------- View types returned by selectors ----------

/** A room on a housekeeper's plan, with its planned slot. */
export interface PlannedRoom {
  room: Room
  start: Minutes
  end: Minutes
  /** end > shiftEnd or end > arrival */
  late: boolean
  /** Has a come-back time that is still in the future. */
  waiting: boolean
}

export type Recommendation =
  | { type: 'pick'; housekeeperId: HousekeeperId; start: Minutes; end: Minutes; reason: string }
  | { type: 'no-one'; reason: string }

export interface AssignOption {
  housekeeperId: HousekeeperId
  name: string
  start: Minutes
  end: Minutes
  feasible: boolean
  /** "On floor 2 · free 11:50 · done 12:10 · 50 min spare" or "Would finish 1:03" */
  reason: string
}

export interface QueueItem {
  room: Room
  /** null when blocked (waiting on maintenance). */
  recommendation: Recommendation | null
  /** "Unassigned" · "Rosa flagged · DND until 11:30" · "Rosa handed off · would run past 1:00" · "Waiting on maintenance · Light" */
  label: string
}

export type TeamStatus = 'green' | 'amber' | 'red'

export interface Projection {
  finish: Minutes
  slack: number
  status: TeamStatus
  roomsLeft: number
}

export interface InboxItem {
  id: string
  roomId?: string
  title: string
  subtitle?: string
  at: Minutes
}

export interface Inbox {
  urgent: InboxItem[]
  decision: InboxItem[]
  info: InboxItem[]
}

export interface DndChip {
  label: string
  until: Minutes
  /** true for "Later" (= shift end). */
  later: boolean
}
