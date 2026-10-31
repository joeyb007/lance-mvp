// Pure, deterministic scheduling (TDD §7). No LLM, no randomness, no speeds.
import { fmt } from './format'
import { HOUSEKEEPER_IDS, PEOPLE } from './seed'
import type { AssignOption, Housekeeper, HousekeeperId, Minutes, PlannedRoom, Recommendation, Room, Snapshot } from './types'

export const STAYOVER_MIN = 20
export const CHECKOUT_MIN = 35
export const SUITE_EXTRA_MIN = 15
export const FLOOR_CHANGE_MIN = 3

/** Same for everyone: by room type only. */
export function duration(room: Room): number {
  return (room.clean === 'checkout' ? CHECKOUT_MIN : STAYOVER_MIN) + (room.suite ? SUITE_EXTRA_MIN : 0)
}

const walk = (from: number, to: number) => (from === to ? 0 : FLOOR_CHANGE_MIN)

/**
 * Plan an ordered list of room ids for one housekeeper, starting from `now` on their current floor.
 * An in-progress room keeps its real startedAt. A room with availableAt can't start before it.
 */
export function planList(state: Snapshot, hk: Housekeeper, list: string[]): PlannedRoom[] {
  let t = state.now
  let floor = hk.floor
  return list.map((id) => {
    const room = state.rooms[id]
    let start: Minutes
    let end: Minutes
    if (room.status === 'in_progress' && room.startedAt != null) {
      start = room.startedAt
      end = Math.max(start + duration(room), state.now)
    } else {
      start = Math.max(t + walk(floor, room.floor), room.availableAt ?? -Infinity)
      end = start + duration(room)
    }
    t = end
    floor = room.floor
    const late = end > hk.shiftEnd || (room.arrival != null && end > room.arrival)
    const waiting = room.status === 'todo' && room.availableAt != null && room.availableAt > state.now
    return { room, start, end, late, waiting }
  })
}

export function timeline(state: Snapshot, hkId: HousekeeperId): PlannedRoom[] {
  const hk = state.housekeepers[hkId]
  return planList(state, hk, hk.list)
}

/** When and where the housekeeper is free after their current list. */
export function freeAt(state: Snapshot, hkId: HousekeeperId): { at: Minutes; floor: number } {
  const last = timeline(state, hkId).at(-1)
  return last ? { at: last.end, floor: last.room.floor } : { at: state.now, floor: state.housekeepers[hkId].floor }
}

/** What happens if this room is appended to this housekeeper's list (rule 3: handoffs join the end). */
export function optionFor(state: Snapshot, hkId: HousekeeperId, room: Room): AssignOption {
  const hk = state.housekeepers[hkId]
  const free = freeAt(state, hkId)
  const start = Math.max(free.at + walk(free.floor, room.floor), room.availableAt ?? state.now)
  const end = start + duration(room)
  const missesArrival = room.arrival != null && end > room.arrival
  const feasible = end <= hk.shiftEnd && !missesArrival
  const reason = feasible
    ? `On floor ${free.floor} · free ${fmt(free.at)} · done ${fmt(end)} · ${hk.shiftEnd - end} min spare`
    : missesArrival
      ? `Would finish ${fmt(end)} · guest arrives ${fmt(room.arrival!)}`
      : `Would finish ${fmt(end)} · shift ends ${fmt(hk.shiftEnd)}`
  return { housekeeperId: hkId, name: PEOPLE[hkId].name, start, end, feasible, reason }
}

export function optionsFor(state: Snapshot, room: Room): AssignOption[] {
  return HOUSEKEEPER_IDS.map((id) => optionFor(state, id, room))
}

/** Earliest finish; tiebreak same floor, then most slack, then fixed id order. Never an infeasible pick. */
export function recommend(state: Snapshot, room: Room): Recommendation {
  const ranked = optionsFor(state, room)
    .filter((o) => o.feasible)
    .sort((a, b) => {
      if (a.end !== b.end) return a.end - b.end
      const af = freeAt(state, a.housekeeperId).floor === room.floor ? 0 : 1
      const bf = freeAt(state, b.housekeeperId).floor === room.floor ? 0 : 1
      if (af !== bf) return af - bf
      const slack = (o: AssignOption) => state.housekeepers[o.housekeeperId].shiftEnd - o.end
      if (slack(a) !== slack(b)) return slack(b) - slack(a)
      return HOUSEKEEPER_IDS.indexOf(a.housekeeperId) - HOUSEKEEPER_IDS.indexOf(b.housekeeperId)
    })
  const best = ranked[0]
  if (best) return { type: 'pick', housekeeperId: best.housekeeperId, start: best.start, end: best.end, reason: best.reason }
  return {
    type: 'no-one',
    reason:
      room.arrival != null
        ? `No one can finish this before ${fmt(room.arrival)}.`
        : 'No one can finish this before their shift ends.',
  }
}

/** Priority is calculated, never set by hand (rule 4): deadline, then earliest start, then wait time. */
export function queueOrder(state: Snapshot): Room[] {
  const shiftEnd = Math.min(...HOUSEKEEPER_IDS.map((id) => state.housekeepers[id].shiftEnd))
  return state.queue
    .map((id) => state.rooms[id])
    .sort(
      (a, b) =>
        (a.arrival ?? shiftEnd) - (b.arrival ?? shiftEnd) ||
        (a.availableAt ?? state.now) - (b.availableAt ?? state.now) ||
        (a.queuedAt ?? 0) - (b.queuedAt ?? 0),
    )
}
