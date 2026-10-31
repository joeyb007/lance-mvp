// Pure: which status tags a room card shows. Reads the PlannedRoom from roomsFor(); never schedules anything.
import { arrivalBadge, fmt } from '../../domain/format'
import { SUPERVISOR_NAME } from '../../domain/seed'
import type { Minutes, PlannedRoom } from '../../domain/types'
import type { PillTone } from '../../ui'

export interface Tag {
  text: string
  tone: PillTone
}

/**
 * Tags in display order. The in-progress state is shown as the card's green banner, not a tag.
 * - waiting (DND / not yet available): "Available at 12:00" or "From Jordan · available 11:30"
 * - handed over, now available: "From Jordan · ready now" (had a come-back time) or "From Jordan"
 * - own room whose come-back time has passed: "Ready now"
 * - arrival: "Guest arrives 11:00" (red when under an hour away)
 * - late: "Late for 11:00 arrival" (red) or "Runs past 1:00" (amber: she can hand it off)
 */
export function roomTags(p: PlannedRoom, now: Minutes, shiftEnd: Minutes): Tag[] {
  const { room } = p
  const tags: Tag[] = []
  const todo = room.status === 'todo'

  if (room.fromSupervisor) {
    if (p.waiting && room.availableAt != null) tags.push({ text: `From ${SUPERVISOR_NAME} · available ${fmt(room.availableAt)}`, tone: 'neutral' })
    else if (todo && room.availableAt != null) tags.push({ text: `From ${SUPERVISOR_NAME} · ready now`, tone: 'green' })
    else tags.push({ text: `From ${SUPERVISOR_NAME}`, tone: 'neutral' })
  } else if (p.waiting && room.availableAt != null) {
    tags.push({ text: `Available at ${fmt(room.availableAt)}`, tone: 'neutral' })
  } else if (todo && room.availableAt != null && room.availableAt <= now) {
    tags.push({ text: 'Ready now', tone: 'green' })
  }

  const badge = arrivalBadge(room, now)
  if (badge) tags.push({ text: badge.text, tone: badge.urgent ? 'red' : 'outline' })

  if (p.late) {
    if (room.arrival != null && p.end > room.arrival) tags.push({ text: `Late for ${fmt(room.arrival)} arrival`, tone: 'red' })
    // Amber, not red: she can act on it (Hand off). Red stays for a missed guest arrival.
    else if (p.end > shiftEnd) tags.push({ text: `Runs past ${fmt(shiftEnd)}`, tone: 'amber' })
  }
  return tags
}
