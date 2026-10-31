// TDD §7 tests. Written before schedule.ts / reducer.ts / selectors.ts.
import { describe, expect, it } from 'vitest'
import { seedState } from './seed'
import { duration, timeline } from './schedule'
import { reducer } from './reducer'
import {
  dndChips,
  doneFor,
  inbox,
  options,
  projections,
  queue,
  recommendation,
  roomsFor,
  roomsNeedingAttention,
} from './selectors'
import type { Action, State } from './types'

const t = (h: number, m = 0) => h * 60 + m
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const ids = (s: State, hk: 'maya' | 'priya' | 'rosa') => roomsFor(s, hk).map((p) => p.room.id)
const finish = (s: State, hk: 'maya' | 'priya' | 'rosa') => projections(s)[hk].finish

const mayaDnd: Action = { type: 'flag', roomId: '305', reason: 'dnd', until: t(12) }
const rosaDnd: Action = { type: 'flag', roomId: '107', reason: 'dnd', until: t(11, 30) }

describe('1. timelines at start', () => {
  it('Maya 12:40, Priya 11:50, Rosa 13:05 (red)', () => {
    const s = seedState()
    expect(finish(s, 'maya')).toBe(t(12, 40))
    expect(finish(s, 'priya')).toBe(t(11, 50))
    expect(finish(s, 'rosa')).toBe(t(13, 5))
    expect(projections(s).rosa.status).toBe('red')
    expect(projections(s).maya.status).toBe('green')
  })
})

describe('2. durations by room type only', () => {
  it('stayover 20, checkout 35, suite +15', () => {
    const s = seedState()
    expect(duration(s.rooms['201'])).toBe(20)
    expect(duration(s.rooms['101'])).toBe(35)
    expect(duration(s.rooms['105'])).toBe(50)
  })
  it('adds 3 min per floor change', () => {
    const s = seedState()
    // Priya on floor 2 taking 107 (floor 1): free 11:50 + 3 → 11:53
    const o = options(s, '107').find((x) => x.housekeeperId === 'priya')!
    expect(o.start).toBe(t(11, 53))
  })
})

describe('3. Maya DND 305 until 12:00 fits', () => {
  it('stays with Maya at the end of her list, finish unchanged, queue unchanged', () => {
    const s = run(seedState(), mayaDnd)
    expect(ids(s, 'maya')).toEqual(['302', '303', '304', '306', '305'])
    expect(s.rooms['305'].ownerId).toBe('maya')
    expect(s.rooms['305'].availableAt).toBe(t(12))
    expect(finish(s, 'maya')).toBe(t(12, 40))
    expect(s.queue).toEqual(['106', '207'])
    expect(s.toast?.title).toBe('305 moved to 12:00')
    expect(s.toast?.undoable).toBe(true)
  })
})

describe('4. Rosa DND 107 until 11:30 does not fit', () => {
  it('leaves her list, joins the queue, Rosa finishes 12:30', () => {
    const s = run(seedState(), rosaDnd)
    expect(ids(s, 'rosa')).toEqual(['101', '104', '105'])
    expect(s.queue).toContain('107')
    expect(s.rooms['107'].ownerId).toBeNull()
    expect(s.rooms['107'].availableAt).toBe(t(11, 30))
    expect(finish(s, 'rosa')).toBe(t(12, 30))
    expect(s.toast?.title).toBe('107 sent to Jordan')
  })
})

describe('5. recommend alone', () => {
  it('207 → Priya 11:50–12:10', () => {
    const r = recommendation(run(seedState(), rosaDnd), '207')
    expect(r).toMatchObject({ type: 'pick', housekeeperId: 'priya', start: t(11, 50), end: t(12, 10) })
    if (r.type === 'pick') expect(r.reason).toBe('On floor 2 · free 11:50 · done 12:10 · 50 min spare')
  })
  it('107 → Priya 11:53–12:28', () => {
    const r = recommendation(run(seedState(), rosaDnd), '107')
    expect(r).toMatchObject({ type: 'pick', housekeeperId: 'priya', start: t(11, 53), end: t(12, 28) })
  })
})

describe('6. Maya is infeasible for 207 and 107', () => {
  it('options() greys her out with a would-finish time', () => {
    const s = run(seedState(), rosaDnd)
    for (const roomId of ['207', '107']) {
      const maya = options(s, roomId).find((o) => o.housekeeperId === 'maya')!
      expect(maya.feasible).toBe(false)
      expect(maya.end).toBeGreaterThan(t(13))
      expect(maya.reason).toMatch(/^Would finish /)
    }
  })
})

describe('7. 106 → no-one', () => {
  it('no one can finish a checkout before 11:00', () => {
    expect(recommendation(seedState(), '106').type).toBe('no-one')
  })
})

describe('8. Assign all (greedy)', () => {
  it('207 → Priya 11:50–12:10, 107 → Priya 12:13–12:48, 106 stays', () => {
    const before = run(seedState(), mayaDnd, rosaDnd)
    expect(roomsNeedingAttention(before)).toBe(3)
    const s = run(before, { type: 'assignAll' })
    const priya = roomsFor(s, 'priya')
    expect(priya.map((p) => p.room.id)).toEqual(['201', '202', '203', '206', '207', '107'])
    expect(priya.at(-2)).toMatchObject({ start: t(11, 50), end: t(12, 10) })
    expect(priya.at(-1)).toMatchObject({ start: t(12, 13), end: t(12, 48) })
    expect(s.queue).toEqual(['106'])
    expect(roomsNeedingAttention(s)).toBe(1)
    expect(finish(s, 'maya')).toBe(t(12, 40))
    expect(finish(s, 'priya')).toBe(t(12, 48))
    expect(finish(s, 'rosa')).toBe(t(12, 30))
    expect(s.rooms['107'].fromSupervisor).toBe(true)
    expect(s.toast?.title).toBe('2 rooms assigned')
  })
})

describe('9. assigning changes only the receiver', () => {
  it('other housekeepers deep-equal', () => {
    const before = run(seedState(), rosaDnd)
    const s = run(before, { type: 'assign', roomId: '207', housekeeperId: 'priya' })
    expect(s.housekeepers.maya).toEqual(before.housekeepers.maya)
    expect(s.housekeepers.rosa).toEqual(before.housekeepers.rosa)
    expect(ids(s, 'priya').at(-1)).toBe('207')
  })
  it('refuses an infeasible assignment (rule 6)', () => {
    const before = run(seedState(), rosaDnd)
    const s = run(before, { type: 'assign', roomId: '207', housekeeperId: 'maya' })
    expect(s.housekeepers).toEqual(before.housekeepers)
    expect(s.queue).toEqual(before.queue)
  })
})

describe('10. undo restores exact prior state', () => {
  const strip = (s: State) => ({ ...s, undo: null, toast: null, seq: 0 })
  it('after Assign all', () => {
    const before = run(seedState(), mayaDnd, rosaDnd, { type: 'dismissToast' })
    const after = run(before, { type: 'assignAll' }, { type: 'undo' })
    expect(strip(after)).toEqual(strip(before))
  })
  it('after a flag', () => {
    const before = seedState()
    const after = run(before, rosaDnd, { type: 'undo' })
    expect(strip(after)).toEqual(strip(before))
  })
  it('only one level', () => {
    const s = run(seedState(), mayaDnd, rosaDnd, { type: 'undo' }, { type: 'undo' })
    expect(s.rooms['305'].availableAt).toBe(t(12)) // Maya's flag survives
    expect(s.queue).not.toContain('107')
  })
})

describe('11. broken flag', () => {
  it('blocked in queue, no recommendation, skipped by Assign all, recommended after markFixed', () => {
    let s = run(seedState(), { type: 'flag', roomId: '305', reason: 'broken', issue: 'light' })
    expect(ids(s, 'maya')).not.toContain('305')
    expect(s.rooms['305']).toMatchObject({ blocked: true, ownerId: null })
    expect(s.tickets).toHaveLength(1)
    expect(s.toast?.title).toBe('Ticket sent: 305 · Light')
    const item = queue(s).find((q) => q.room.id === '305')!
    expect(item.recommendation).toBeNull()
    expect(item.label).toMatch(/Waiting on maintenance/)
    s = run(s, { type: 'assignAll' })
    expect(s.queue).toContain('305')
    s = run(s, { type: 'markFixed', ticketId: s.tickets[0].id })
    expect(s.rooms['305'].blocked).toBeFalsy()
    expect(recommendation(s, '305').type).toBe('pick')
  })
})

describe('12. inbox grouping', () => {
  it('Urgent / Needs a decision / For your info', () => {
    const s = run(seedState(), mayaDnd, rosaDnd)
    const box = inbox(s)
    expect(box.urgent.map((i) => i.title)).toEqual(["106 can't be ready for the 11:00 arrival"])
    // Needs a decision excludes no-one rooms (106 is already Urgent)
    expect(box.decision.map((i) => i.roomId).sort()).toEqual(['107', '207'])
    expect(box.info.map((i) => i.title)).toEqual(['Maya moved 305 to 12:00'])
  })
})

describe('13. a DND that breaks a guest arrival does not fit', () => {
  it('even when shift end is fine', () => {
    // 201 has a guest arriving 11:45. DND until 11:30 → appended after 206: 11:30–11:50 → late.
    const base = seedState()
    const s = { ...base, rooms: { ...base.rooms, '201': { ...base.rooms['201'], arrival: t(11, 45) } } }
    expect(roomsFor(s, 'priya')[0].late).toBe(false)
    const after = run(s, { type: 'flag', roomId: '201', reason: 'dnd', until: t(11, 30) })
    expect(after.rooms['201'].ownerId).toBeNull()
    expect(after.queue).toContain('201')
    expect(projections(after).priya.finish).toBeLessThan(t(13)) // shift end was never the problem
  })
  it('the same DND with a later arrival fits', () => {
    const base = seedState()
    const s = { ...base, rooms: { ...base.rooms, '201': { ...base.rooms['201'], arrival: t(12) } } }
    const after = run(s, { type: 'flag', roomId: '201', reason: 'dnd', until: t(11, 30) })
    expect(after.rooms['201'].ownerId).toBe('priya')
  })
})

describe('14. skip ahead plays out the plan', () => {
  it('skip to 11:30: Priya 201–203 done (simulated), 206 in progress at 11:30; owners/order unchanged', () => {
    const before = seedState()
    const s = run(before, { type: 'advanceClock', minutes: 30 }, { type: 'advanceClock', minutes: 30 })
    expect(s.now).toBe(t(11, 30))
    for (const id of ['201', '202', '203']) {
      expect(s.rooms[id]).toMatchObject({ status: 'done', simulated: true, ownerId: 'priya' })
    }
    expect(s.rooms['206']).toMatchObject({ status: 'in_progress', startedAt: t(11, 30) })
    expect(ids(s, 'priya')).toEqual(['206'])
    // nothing changes owner or order
    expect(ids(s, 'maya')).toEqual(before.housekeepers.maya.list.filter((id) => s.rooms[id].status !== 'done'))
    expect(ids(s, 'rosa')).toEqual(before.housekeepers.rosa.list.filter((id) => s.rooms[id].status !== 'done'))
    expect(s.queue).toEqual(before.queue)
    expect(doneFor(s, 'priya').map((r) => r.id).sort()).toEqual(['201', '202', '203'])
  })
  it('a hand-started room finishes at its planned end', () => {
    const s = run(seedState(), { type: 'start', roomId: '305' }, { type: 'advanceClock', minutes: 30 })
    expect(s.rooms['305']).toMatchObject({ status: 'done', doneAt: t(10, 50), simulated: true })
  })
  it('a DND room is only simulated once its slot arrives', () => {
    const s = run(seedState(), mayaDnd, { type: 'advanceClock', minutes: 90 }) // → 12:00
    expect(s.rooms['305'].status).toBe('todo')
  })
})

describe('15. blocked room in the queue across a skip', () => {
  it('untouched and still excluded from Assign all', () => {
    const flagged = run(seedState(), { type: 'flag', roomId: '305', reason: 'broken', issue: 'leak' })
    const s = run(flagged, { type: 'advanceClock', minutes: 30 })
    expect(s.rooms['305']).toEqual(flagged.rooms['305'])
    expect(run(s, { type: 'assignAll' }).queue).toContain('305')
  })
})

describe('16. skip clears undo and toast', () => {
  it('', () => {
    const s = run(seedState(), mayaDnd, { type: 'advanceClock', minutes: 30 })
    expect(s.undo).toBeNull()
    expect(s.toast).toBeNull()
    expect(run(s, { type: 'undo' })).toEqual(s)
  })
})

describe('17. manual Done early', () => {
  it('pulls the rest of the day earlier', () => {
    let s = run(seedState(), { type: 'start', roomId: '305' })
    expect(finish(s, 'maya')).toBe(t(12, 40))
    s = { ...s, now: t(10, 40) } // 10 min in, 10 min early
    s = run(s, { type: 'complete', roomId: '305' })
    expect(s.rooms['305']).toMatchObject({ status: 'done', doneAt: t(10, 40) })
    expect(s.rooms['305'].simulated).toBeFalsy()
    expect(finish(s, 'maya')).toBe(t(12, 30))
    expect(ids(s, 'maya')).toEqual(['302', '303', '304', '306'])
    expect(s.toast?.undoable).toBe(true)
  })
})

describe('18. DND chips', () => {
  it('at 10:30: 11:00 · 11:30 · 12:00 · Later', () => {
    expect(dndChips(seedState(), 'maya').map((c) => c.label)).toEqual(['11:00', '11:30', '12:00', 'Later'])
  })
  it('at 12:30: only Later (13:00 = shift end is dropped)', () => {
    const s = run(seedState(), { type: 'advanceClock', minutes: 120 })
    expect(dndChips(s, 'maya').map((c) => c.label)).toEqual(['Later'])
  })
  it('strictly after now when off the half hour', () => {
    const s = { ...seedState(), now: t(10, 45) }
    expect(dndChips(s, 'maya').map((c) => c.label)).toEqual(['11:00', '11:30', '12:00', 'Later'])
  })
})

describe('19. Later always escalates', () => {
  it('Priya has 70 min spare and still escalates Later', () => {
    const s = run(seedState(), { type: 'flag', roomId: '201', reason: 'dnd', until: t(13) })
    expect(s.rooms['201'].ownerId).toBeNull()
    expect(s.queue).toContain('201')
  })
})

describe('20. at load', () => {
  it('3 needing attention; Urgent has 106 and Rosa', () => {
    const s = seedState()
    expect(roomsNeedingAttention(s)).toBe(3)
    expect(inbox(s).urgent.map((i) => i.title)).toEqual([
      "106 can't be ready for the 11:00 arrival",
      'Rosa on track to finish 1:05',
    ])
    expect(inbox(s).urgent[1].subtitle).toMatch(/107 at risk/)
  })
})

describe('21. role switch + Start and undo', () => {
  it('switching roles clears the undo slot and toast', () => {
    const s = run(seedState(), mayaDnd, { type: 'setRole', personId: 'jordan' })
    expect(s.role).toBe('jordan')
    expect(s.undo).toBeNull()
    expect(s.toast).toBeNull()
  })
  it('Start is not undoable', () => {
    const s = run(seedState(), mayaDnd, { type: 'start', roomId: '302' })
    expect(s.undo).toBeNull()
    expect(run(s, { type: 'undo' }).rooms['302'].status).toBe('in_progress')
  })
})

describe('22. Start order + flag mid-clean', () => {
  it('Start moves the room to the front and locks other starts', () => {
    let s = run(seedState(), { type: 'start', roomId: '304' })
    expect(ids(s, 'maya')[0]).toBe('304')
    expect(s.rooms['304']).toMatchObject({ status: 'in_progress', startedAt: t(10, 30) })
    s = run(s, { type: 'start', roomId: '302' })
    expect(s.rooms['302'].status).toBe('todo')
  })
  it('flagging an in-progress room clears startedAt', () => {
    const s = run(seedState(), { type: 'start', roomId: '305' }, mayaDnd)
    expect(s.rooms['305'].status).toBe('todo')
    expect(s.rooms['305'].startedAt).toBeUndefined()
  })
})

describe('timeline sanity', () => {
  it('Rosa: 101 10:30–11:05, 104 –11:40, 105 –12:30, 107 –13:05 (late)', () => {
    const tl = timeline(seedState(), 'rosa')
    expect(tl.map((p) => [p.room.id, p.start, p.end, p.late])).toEqual([
      ['101', t(10, 30), t(11, 5), false],
      ['104', t(11, 5), t(11, 40), false],
      ['105', t(11, 40), t(12, 30), false],
      ['107', t(12, 30), t(13, 5), true],
    ])
  })
})
