// Read-only views over State (part of the frozen contract, TDD §10).
import { fmt, ISSUE_LABEL } from './format'
import { optionsFor, queueOrder, recommend, timeline } from './schedule'
import { firstName, HOUSEKEEPER_IDS, MAINTENANCE_NAME } from './seed'
import type {
  AssignOption,
  DndChip,
  HousekeeperId,
  Inbox,
  InboxItem,
  PlannedRoom,
  Projection,
  QueueItem,
  Recommendation,
  Room,
  Snapshot,
  Ticket,
} from './types'

/** Open rooms on a housekeeper's list, in order, with planned times. */
export function roomsFor(s: Snapshot, hkId: HousekeeperId): PlannedRoom[] {
  return timeline(s, hkId)
}

/** "Done today", most recent first. */
export function doneFor(s: Snapshot, hkId: HousekeeperId): Room[] {
  return Object.values(s.rooms)
    .filter((r) => r.ownerId === hkId && r.status === 'done')
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
}

export function recommendation(s: Snapshot, roomId: string): Recommendation {
  return recommend(s, s.rooms[roomId])
}

/** Every housekeeper's would-be slot for this room. Infeasible ones are shown greyed out. */
export function options(s: Snapshot, roomId: string): AssignOption[] {
  return optionsFor(s, s.rooms[roomId])
}

function queueLabel(s: Snapshot, room: Room): string {
  const who = room.flaggedBy ? firstName(room.flaggedBy) : null
  switch (room.queueReason) {
    case 'dnd': {
      const shiftEnd = room.flaggedBy ? s.housekeepers[room.flaggedBy].shiftEnd : Infinity
      const when = room.availableAt != null && room.availableAt < shiftEnd ? `DND until ${fmt(room.availableAt)}` : "DND · can't get back today"
      return `${who} flagged · ${when}`
    }
    case 'broken': {
      const ticket = s.tickets.find((t) => t.id === room.ticketId)
      const issue = ticket ? ISSUE_LABEL[ticket.issue] : 'Broken'
      return room.blocked ? `Waiting on maintenance · ${issue}` : `Fixed · ${issue} · ready to assign`
    }
    default:
      return 'Unassigned'
  }
}

/** Assignment queue, most urgent first; blocked (waiting on maintenance) rooms last. */
export function queue(s: Snapshot): QueueItem[] {
  const ordered = queueOrder(s)
  const items = ordered.map((room) => ({
    room,
    recommendation: room.blocked ? null : recommend(s, room),
    label: queueLabel(s, room),
  }))
  return [...items.filter((i) => !i.room.blocked), ...items.filter((i) => i.room.blocked)]
}

export function projections(s: Snapshot): Record<HousekeeperId, Projection> {
  const out = {} as Record<HousekeeperId, Projection>
  for (const id of HOUSEKEEPER_IDS) {
    const hk = s.housekeepers[id]
    const finish = timeline(s, id).at(-1)?.end ?? s.now
    const slack = hk.shiftEnd - finish
    out[id] = { finish, slack, status: slack >= 10 ? 'green' : slack >= 0 ? 'amber' : 'red', roomsLeft: hk.list.length }
  }
  return out
}

/** Owned rooms planned to finish after their arrival or the owner's shift end. */
export function lateRooms(s: Snapshot): PlannedRoom[] {
  return HOUSEKEEPER_IDS.flatMap((id) => timeline(s, id).filter((p) => p.late))
}

/** Headline: queue (incl. blocked) + owned rooms on track to be late. */
export function roomsNeedingAttention(s: Snapshot): number {
  return s.queue.length + lateRooms(s).length
}

export function inbox(s: Snapshot): Inbox {
  const urgent: InboxItem[] = []
  const decision: InboxItem[] = []

  for (const room of queueOrder(s)) {
    if (room.blocked) continue
    const rec = recommend(s, room)
    if (rec.type === 'no-one') {
      urgent.push({
        id: `noone-${room.id}`,
        roomId: room.id,
        title:
          room.arrival != null
            ? `${room.id} can't be ready for the ${fmt(room.arrival)} arrival`
            : `${room.id} can't be finished before shift end`,
        subtitle: 'No one can finish it in time. Let the front desk know.',
        at: room.queuedAt ?? s.now,
      })
    } else {
      decision.push({
        id: `q-${room.id}`,
        roomId: room.id,
        title: `${room.id} needs someone`,
        subtitle: `Best: ${firstName(rec.housekeeperId)} · done ${fmt(rec.end)}`,
        at: room.queuedAt ?? s.now,
      })
    }
  }

  // Owned rooms on track to be late (informational: rule 1, the supervisor can't move them).
  for (const id of HOUSEKEEPER_IDS) {
    const hk = s.housekeepers[id]
    const plan = timeline(s, id)
    const overShift = plan.filter((p) => p.end > hk.shiftEnd)
    if (overShift.length) {
      urgent.push({
        id: `late-${id}`,
        title: `${firstName(id)} on track to finish ${fmt(plan.at(-1)!.end)}`,
        subtitle: `${overShift.map((p) => p.room.id).join(', ')} at risk · shift ends ${fmt(hk.shiftEnd)}`,
        at: s.now,
      })
    }
    for (const p of plan) {
      if (p.end <= hk.shiftEnd && p.room.arrival != null && p.end > p.room.arrival) {
        urgent.push({
          id: `arrival-${p.room.id}`,
          roomId: p.room.id,
          title: `${p.room.id} won't be ready for the ${fmt(p.room.arrival)} arrival`,
          subtitle: `On ${firstName(id)}'s list · done ${fmt(p.end)}`,
          at: s.now,
        })
      }
    }
  }

  const info: InboxItem[] = []
  for (const e of [...s.events].reverse()) {
    switch (e.kind) {
      case 'dnd_absorbed':
        info.push({ id: e.id, roomId: e.roomId, at: e.at, title: `${firstName(e.by)} moved ${e.roomId} to ${fmt(e.until)}`, subtitle: `Do not disturb · still fits ${firstName(e.by)}'s day` })
        break
      case 'declined':
        info.push({ id: e.id, roomId: e.roomId, at: e.at, title: `${e.roomId} · guest declined service`, subtitle: `Reported by ${firstName(e.by)} · no action needed` })
        break
      case 'ticket_raised':
        info.push({ id: e.id, roomId: e.roomId, at: e.at, title: `${e.roomId} · ${ISSUE_LABEL[e.issue]} broken`, subtitle: `Ticket sent to ${MAINTENANCE_NAME} · waiting on maintenance` })
        break
      case 'ticket_fixed':
        info.push({ id: e.id, roomId: e.roomId, at: e.at, title: `${e.roomId} fixed`, subtitle: 'Back in the queue to assign' })
        break
    }
  }

  return { urgent, decision, info }
}

/** Next three half-hours strictly after now, dropping any at/after shift end, plus "Later" (= shift end). */
export function dndChips(s: Snapshot, hkId: HousekeeperId): DndChip[] {
  const shiftEnd = s.housekeepers[hkId].shiftEnd
  const first = Math.floor(s.now / 30) * 30 + 30
  const chips: DndChip[] = [first, first + 30, first + 60]
    .filter((m) => m < shiftEnd)
    .map((m) => ({ label: fmt(m), until: m, later: false }))
  return [...chips, { label: 'Later', until: shiftEnd, later: true }]
}

/** Maintenance tickets, newest first. */
export function tickets(s: Snapshot): Ticket[] {
  return [...s.tickets].reverse()
}
