import type { Housekeeper, HousekeeperId, PersonId, Room, State } from './types'

/** The demo clock starts here. One constant (TDD §8). */
export const START_TIME = 10 * 60 + 30 // 10:30 AM
export const SHIFT_START = 5 * 60 // 5:00 AM
export const SHIFT_END = 13 * 60 // 1:00 PM

export const PEOPLE: Record<PersonId, { name: string; initials: string; role: 'housekeeper' | 'supervisor' }> = {
  jordan: { name: 'Jordan Blake', initials: 'JB', role: 'supervisor' },
  maya: { name: 'Maya Chen', initials: 'MC', role: 'housekeeper' },
  priya: { name: 'Priya Patel', initials: 'PP', role: 'housekeeper' },
  rosa: { name: 'Rosa Alvarez', initials: 'RA', role: 'housekeeper' },
}

export const HOUSEKEEPER_IDS: HousekeeperId[] = ['maya', 'priya', 'rosa']
export const SUPERVISOR_NAME = 'Jordan'
export const MAINTENANCE_NAME = 'Sam'

export const firstName = (id: PersonId) => PEOPLE[id].name.split(' ')[0]

function room(id: string, clean: Room['clean'], ownerId: HousekeeperId | null, extra: Partial<Room> = {}): Room {
  return { id, floor: Number(id[0]), clean, suite: false, status: 'todo', ownerId, ...extra }
}

function hk(id: HousekeeperId, floor: number, list: string[]): Housekeeper {
  return { id, name: PEOPLE[id].name, shiftStart: SHIFT_START, shiftEnd: SHIFT_END, floor, list }
}

export function seedState(): State {
  const rooms: Room[] = [
    // Maya, floor 3: finishes 12:40
    room('305', 'stayover', 'maya'),
    room('302', 'stayover', 'maya'),
    room('303', 'stayover', 'maya'),
    room('304', 'checkout', 'maya'),
    room('306', 'checkout', 'maya'),
    // Priya, floor 2: finishes 11:50
    room('201', 'stayover', 'priya'),
    room('202', 'stayover', 'priya'),
    room('203', 'stayover', 'priya'),
    room('206', 'stayover', 'priya'),
    // Rosa, floor 1: finishes 1:05 (over). Fewer rooms than Maya, more work.
    room('101', 'checkout', 'rosa'),
    room('104', 'checkout', 'rosa'),
    room('105', 'checkout', 'rosa', { suite: true }),
    room('107', 'checkout', 'rosa'),
    // Queue at start
    room('106', 'checkout', null, { arrival: 11 * 60, queueReason: 'unassigned', queuedAt: START_TIME }),
    room('207', 'stayover', null, { queueReason: 'unassigned', queuedAt: START_TIME }),
  ]

  return {
    now: START_TIME,
    role: 'maya',
    rooms: Object.fromEntries(rooms.map((r) => [r.id, r])),
    housekeepers: {
      maya: hk('maya', 3, ['305', '302', '303', '304', '306']),
      priya: hk('priya', 2, ['201', '202', '203', '206']),
      rosa: hk('rosa', 1, ['101', '104', '105', '107']),
    },
    queue: ['106', '207'],
    tickets: [],
    events: [],
    toast: null,
    seq: 0,
    undo: null,
  }
}
