import type { Issue, Minutes, Room } from './types'

/** 630 → "10:30", 780 → "1:00", 785 → "1:05". 12-hour, no am/pm (a shift never spans noon ambiguity). */
export function fmt(m: Minutes): string {
  const h = Math.floor(m / 60) % 12 || 12
  return `${h}:${String(m % 60).padStart(2, '0')}`
}

export const ISSUE_LABEL: Record<Issue, string> = {
  light: 'Light',
  leak: 'Leak',
  ac: 'AC/heat',
  tv: 'TV',
  other: 'Other',
}

/** Plain language, no PMS codes (critique #1). */
export function cleanLabel(room: Room): string {
  const base = room.clean === 'checkout' ? 'Guest checked out · full clean' : 'Guest staying · tidy & refresh'
  return room.suite ? `${base} · Suite` : base
}

/** "Guest arrives 11:00" (critique #2). Red when under 60 min away. */
export function arrivalBadge(room: Room, now: Minutes): { text: string; urgent: boolean } | null {
  if (room.arrival == null) return null
  return { text: `Guest arrives ${fmt(room.arrival)}`, urgent: room.arrival - now < 60 }
}
