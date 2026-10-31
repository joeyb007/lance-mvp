// Hand off: a housekeeper sends a room that would run past her shift end straight to the queue.
import { describe, expect, it } from 'vitest'
import { seedState } from './seed'
import { reducer } from './reducer'
import { projections, queue, roomsFor, roomsNeedingAttention } from './selectors'
import type { Action, HousekeeperId, State } from './types'

const t = (h: number, m = 0) => h * 60 + m
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const ids = (s: State, hk: HousekeeperId) => roomsFor(s, hk).map((p) => p.room.id)
const handOff = (roomId: string): Action => ({ type: 'handOff', roomId })

describe('handOff', () => {
  it('at load Rosa hands off 107 → queue (handoff), her list 101,104,105, finishes 12:30', () => {
    const s = run(seedState(), handOff('107'))
    expect(ids(s, 'rosa')).toEqual(['101', '104', '105'])
    expect(s.queue).toEqual(['106', '207', '107'])
    expect(s.rooms['107']).toMatchObject({ ownerId: null, status: 'todo', queueReason: 'handoff', flaggedBy: 'rosa', queuedAt: t(10, 30) })
    expect(s.rooms['107'].availableAt).toBeUndefined()
    expect(projections(s).rosa.finish).toBe(t(12, 30))
    expect(s.events.at(-1)).toMatchObject({ kind: 'handed_off', roomId: '107', by: 'rosa', at: t(10, 30) })
    expect(s.toast).toMatchObject({ title: '107 handed off', subtitle: 'Sent to Jordan · would run past 1:00', undoable: true })
    expect(s.undo).not.toBeNull()
  })

  it('then Assign all: 207 → Priya 11:50–12:10, 107 → Priya 12:13–12:48, 106 stays', () => {
    const s = run(seedState(), handOff('107'), { type: 'assignAll' })
    const priya = roomsFor(s, 'priya')
    expect(priya.map((p) => p.room.id)).toEqual(['201', '202', '203', '206', '207', '107'])
    expect(priya.at(-2)).toMatchObject({ start: t(11, 50), end: t(12, 10) })
    expect(priya.at(-1)).toMatchObject({ start: t(12, 13), end: t(12, 48) })
    expect(s.queue).toEqual(['106'])
    expect(roomsNeedingAttention(s)).toBe(1)
  })

  it('undo restores the exact prior state', () => {
    const strip = (s: State) => ({ ...s, undo: null, toast: null, seq: 0 })
    const before = seedState()
    const after = run(before, handOff('107'), { type: 'undo' })
    expect(strip(after)).toEqual(strip(before))
  })

  it('rejects rooms that are not projected past shift end', () => {
    const s = seedState()
    expect(run(s, handOff('101'))).toBe(s) // Rosa's, but done 11:05
    expect(run(s, handOff('302'))).toBe(s) // Maya fits her day
  })

  it('rejects a room in progress', () => {
    // Rosa starts 107: it jumps to the front and ends 11:05, so make it run past by starting late.
    const started = run({ ...seedState(), now: t(12, 40) }, { type: 'start', roomId: '107' })
    expect(started.rooms['107'].status).toBe('in_progress')
    expect(run(started, handOff('107'))).toBe(started)
  })

  it('rejects a room with no owner', () => {
    const s = seedState()
    expect(run(s, handOff('207'))).toBe(s)
    expect(run(s, handOff('nope'))).toBe(s)
  })

  it('queue label: "Rosa handed off · would run past 1:00"', () => {
    const s = run(seedState(), handOff('107'))
    expect(queue(s).find((q) => q.room.id === '107')!.label).toBe('Rosa handed off · would run past 1:00')
  })
})
