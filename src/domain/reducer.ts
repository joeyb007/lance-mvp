// The single reducer. Every undoable action snapshots the whole state first (one level).
import { fmt, ISSUE_LABEL } from './format'
import { planList, queueOrder, recommend, optionFor, timeline } from './schedule'
import { firstName, seedState, SUPERVISOR_NAME, MAINTENANCE_NAME } from './seed'
import type { Action, DomainEvent, HousekeeperId, Room, Snapshot, State } from './types'

type Draft = Snapshot

/** "Other…" note cap (one short line). */
export const NOTE_MAX = 80
/** Toasts show a clipped note so they stay one or two lines; the full note lives on the room / ticket. */
const TOAST_NOTE_MAX = 40
const clip = (text: string) => (text.length > TOAST_NOTE_MAX ? `${text.slice(0, TOAST_NOTE_MAX - 1).trimEnd()}…` : text)

/** Return false to reject the action (state unchanged). */
type Recipe = (d: Draft) => boolean | void

function snapshotOf(state: State): Snapshot {
  const { undo: _undo, ...snap } = state
  return snap
}

function apply(state: State, recipe: Recipe, mode: 'undoable' | 'clearsUndo'): State {
  const before = snapshotOf(state)
  const d = structuredClone(before)
  if (recipe(d) === false) return state
  return { ...d, undo: mode === 'undoable' ? before : null }
}

function toast(d: Draft, title: string, subtitle?: string, undoable = true) {
  d.seq += 1
  d.toast = { id: d.seq, title, subtitle, undoable }
}

type EventInput = DomainEvent extends infer E ? (E extends DomainEvent ? Omit<E, 'id' | 'at'> : never) : never
function log(d: Draft, e: EventInput) {
  d.seq += 1
  d.events.push({ ...e, id: `e${d.seq}`, at: d.now } as DomainEvent)
}

function removeFromList(d: Draft, hkId: HousekeeperId, roomId: string) {
  const hk = d.housekeepers[hkId]
  hk.list = hk.list.filter((id) => id !== roomId)
}

function toQueue(d: Draft, room: Room, reason: Room['queueReason'], flaggedBy: HousekeeperId) {
  room.ownerId = null
  room.queueReason = reason
  room.queuedAt = d.now
  room.flaggedBy = flaggedBy
  delete room.fromSupervisor
  d.queue.push(room.id)
}

/** Assign without checks (callers check feasibility). Handoffs join the END of the list (rule 3). */
function handOver(d: Draft, room: Room, hkId: HousekeeperId) {
  d.queue = d.queue.filter((id) => id !== room.id)
  room.ownerId = hkId
  room.fromSupervisor = true
  delete room.queueReason
  delete room.queuedAt
  d.housekeepers[hkId].list.push(room.id)
  log(d, { kind: 'assigned', roomId: room.id, to: hkId })
}

function flag(d: Draft, action: Extract<Action, { type: 'flag' }>): boolean {
  const room = d.rooms[action.roomId]
  const owner = room?.ownerId
  if (!room || !owner || (room.status !== 'todo' && room.status !== 'in_progress')) return false
  const hk = d.housekeepers[owner]
  // Typed notes ("Other…" under Can't clean it or Something's broken) must say something.
  const typed = action.reason === 'other' || (action.reason === 'broken' && action.issue === 'other')
  const note = typed && 'note' in action ? action.note.trim().slice(0, NOTE_MAX) : ''
  if (typed && !note) return false

  removeFromList(d, owner, room.id)
  room.status = 'todo'
  delete room.startedAt
  delete room.availableAt

  if (action.reason === 'declined') {
    room.status = 'declined'
    room.ownerId = null
    room.flaggedBy = owner
    log(d, { kind: 'declined', roomId: room.id, by: owner })
    toast(d, `${room.id} · guest declined`, `${SUPERVISOR_NAME}'s been told · off your list`)
    return true
  }

  if (action.reason === 'broken') {
    d.seq += 1
    const ticketId = `t${d.seq}`
    d.tickets.push({ id: ticketId, roomId: room.id, issue: action.issue, raisedBy: owner, raisedAt: d.now, assignee: 'sam', ...(note && { note }) })
    room.blocked = true
    room.ticketId = ticketId
    toQueue(d, room, 'broken', owner)
    log(d, { kind: 'ticket_raised', roomId: room.id, by: owner, ticketId, issue: action.issue, ...(note && { note }) })
    toast(d, `Ticket sent: ${room.id} · ${note ? clip(note) : ISSUE_LABEL[action.issue]}`, `${MAINTENANCE_NAME} is on it · off your list`)
    return true
  }

  if (action.reason === 'no_access' || action.reason === 'other') {
    toQueue(d, room, action.reason, owner)
    if (action.reason === 'other') {
      room.note = note
      log(d, { kind: 'escalated', roomId: room.id, by: owner, reason: 'other', note })
      toast(d, `${room.id} sent to ${SUPERVISOR_NAME}`, clip(note))
    } else {
      log(d, { kind: 'escalated', roomId: room.id, by: owner, reason: 'no_access' })
      toast(d, `${room.id} sent to ${SUPERVISOR_NAME}`, `Can't get in · ${SUPERVISOR_NAME} will pick someone`)
    }
    return true
  }

  // DND: slot into their own list at the first room planned to start at/after `until`.
  const until = action.until
  room.availableAt = until
  if (until < hk.shiftEnd) {
    const plan = planList(d, hk, hk.list)
    const idx = plan.findIndex((p) => p.start >= until)
    const at = idx < 0 ? hk.list.length : idx
    const candidate = [...hk.list.slice(0, at), room.id, ...hk.list.slice(at)]
    const fits = planList(d, hk, candidate).every((p) => !p.late)
    if (fits) {
      hk.list = candidate
      log(d, { kind: 'dnd_absorbed', roomId: room.id, by: owner, until })
      toast(d, `${room.id} moved to ${fmt(until)}`, 'Still yours')
      return true
    }
  }
  toQueue(d, room, 'dnd', owner)
  log(d, { kind: 'dnd_escalated', roomId: room.id, by: owner, until })
  toast(d, `${room.id} sent to ${SUPERVISOR_NAME}`, `Doesn't fit your day · ${SUPERVISOR_NAME} will pick someone`)
  return true
}

/** The owner sends a room she can't finish before her shift ends to the queue. Available now (no availableAt). */
function handOff(d: Draft, roomId: string): boolean {
  const room = d.rooms[roomId]
  const owner = room?.ownerId
  if (!room || !owner || room.status !== 'todo') return false
  const hk = d.housekeepers[owner]
  const planned = timeline(d, owner).find((p) => p.room.id === room.id)
  if (!planned || planned.end <= hk.shiftEnd) return false

  removeFromList(d, owner, room.id)
  delete room.availableAt
  toQueue(d, room, 'handoff', owner)
  log(d, { kind: 'handed_off', roomId: room.id, by: owner })
  toast(d, `${room.id} handed off`, `Sent to ${SUPERVISOR_NAME} · would run past ${fmt(hk.shiftEnd)}`)
  return true
}

function assignAll(d: Draft): boolean {
  const given: { roomId: string; to: HousekeeperId }[] = []
  for (const room of queueOrder(d)) {
    if (room.blocked) continue
    const rec = recommend(d, room)
    if (rec.type !== 'pick') continue
    handOver(d, room, rec.housekeeperId)
    given.push({ roomId: room.id, to: rec.housekeeperId })
  }
  if (given.length === 0) return false
  const byPerson = new Map<HousekeeperId, string[]>()
  for (const g of given) byPerson.set(g.to, [...(byPerson.get(g.to) ?? []), g.roomId])
  const summary = [...byPerson].map(([hk, rooms]) => `${rooms.join(', ')} → ${firstName(hk)}`).join(' · ')
  toast(d, given.length === 1 ? '1 room assigned' : `${given.length} rooms assigned`, summary)
  return true
}

/** Skip ahead plays out the plan: "the plan Jordan saw is the plan that happens." */
function advanceClock(d: Draft, minutes: number) {
  const newNow = d.now + minutes
  for (const hk of Object.values(d.housekeepers)) {
    for (const p of timeline(d, hk.id)) {
      const room = d.rooms[p.room.id]
      if (p.end <= newNow) {
        room.status = 'done'
        room.doneAt = p.end
        room.simulated = true
        hk.list = hk.list.filter((id) => id !== room.id)
        hk.floor = room.floor
      } else if (p.start <= newNow) {
        if (room.status === 'todo') {
          room.status = 'in_progress'
          room.startedAt = p.start
        }
        hk.floor = room.floor
      }
    }
  }
  d.now = newNow
  d.toast = null
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return seedState()

    case 'dismissToast':
      return state.toast ? { ...state, toast: null } : state

    case 'setRole':
      return { ...state, role: action.personId, undo: null, toast: null }

    case 'undo':
      if (!state.undo) return state
      return {
        ...state.undo,
        seq: state.seq + 1,
        toast: { id: state.seq + 1, title: 'Undone', undoable: false },
        undo: null,
      }

    case 'start':
      // Not undoable (Done is the correction); clears the undo slot.
      return apply(
        state,
        (d) => {
          const room = d.rooms[action.roomId]
          if (!room?.ownerId || room.status !== 'todo') return false
          const hk = d.housekeepers[room.ownerId]
          if (hk.list.some((id) => d.rooms[id].status === 'in_progress')) return false
          hk.list = [room.id, ...hk.list.filter((id) => id !== room.id)]
          room.status = 'in_progress'
          room.startedAt = d.now
          delete room.availableAt
          d.toast = null
        },
        'clearsUndo',
      )

    case 'complete':
      return apply(
        state,
        (d) => {
          const room = d.rooms[action.roomId]
          if (!room?.ownerId || room.status !== 'in_progress') return false
          const hk = d.housekeepers[room.ownerId]
          room.status = 'done'
          room.doneAt = d.now
          hk.list = hk.list.filter((id) => id !== room.id)
          hk.floor = room.floor
          const left = hk.list.length
          toast(d, `${room.id} completed`, left === 0 ? 'Your list is clear' : `${left} room${left === 1 ? '' : 's'} left on your list`)
        },
        'undoable',
      )

    case 'flag':
      return apply(state, (d) => flag(d, action), 'undoable')

    case 'handOff':
      return apply(state, (d) => handOff(d, action.roomId), 'undoable')

    case 'assign':
      return apply(
        state,
        (d) => {
          const room = d.rooms[action.roomId]
          if (!room || !d.queue.includes(room.id) || room.blocked) return false
          const opt = optionFor(d, action.housekeeperId, room)
          if (!opt.feasible) return false // rule 6: never an infeasible assignment
          handOver(d, room, action.housekeeperId)
          toast(d, `${room.id} is with ${firstName(action.housekeeperId)}`, `Done by ${fmt(opt.end)} · end of their list`)
        },
        'undoable',
      )

    case 'assignAll': {
      const next = apply(state, assignAll, 'undoable')
      if (next !== state) return next
      const seq = state.seq + 1
      return { ...state, seq, toast: { id: seq, title: 'Nothing to assign', subtitle: 'No one can take the remaining rooms in time', undoable: false } }
    }

    case 'markFixed':
      return apply(
        state,
        (d) => {
          const ticket = d.tickets.find((t) => t.id === action.ticketId)
          if (!ticket || ticket.fixedAt != null) return false
          ticket.fixedAt = d.now
          const room = d.rooms[ticket.roomId]
          room.blocked = false
          log(d, { kind: 'ticket_fixed', roomId: room.id, ticketId: ticket.id })
          toast(d, `${room.id} fixed`, `Back in the queue for ${SUPERVISOR_NAME}`)
        },
        'undoable',
      )

    case 'advanceClock':
      // Not undoable: clears the undo slot and dismisses the toast. Reset is the escape hatch.
      return apply(state, (d) => advanceClock(d, action.minutes), 'clearsUndo')
  }
}
