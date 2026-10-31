// attention(): the supervisor's one summary list (TDD §4 rule 7, §7 "Supervisor summary").
import { describe, expect, it } from 'vitest'
import { reducer } from './reducer'
import { seedState } from './seed'
import { attention, inbox, roomsNeedingAttention } from './selectors'
import type { Action, State } from './types'

const t = (h: number, m = 0) => h * 60 + m
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const kinds = (s: State) => attention(s).rows.map((r) => r.kind)
const sum = (s: State) => Object.values(attention(s).counts).reduce((a, b) => a + b, 0)

const mayaDnd: Action = { type: 'flag', roomId: '305', reason: 'dnd', until: t(12) }
const rosaDnd: Action = { type: 'flag', roomId: '107', reason: 'dnd', until: t(11, 30) }

describe('attention summary', () => {
  it('at load: 3 = 1 can\'t be done + 1 late + 1 to assign, in that order', () => {
    const s = seedState()
    const a = attention(s)
    expect(a.total).toBe(3)
    expect(a.counts).toEqual({ cant: 1, late: 1, assign: 1, waiting: 0 })
    expect(kinds(s)).toEqual(['cant', 'late', 'assign'])
    expect(a.rows[0]).toMatchObject({ roomId: '106', title: "106 can't be ready for the 11:00 arrival" })
    expect(a.rows[1]).toMatchObject({ housekeeperId: 'rosa', title: 'Rosa on track to finish 1:05' })
    expect(a.rows[1].subtitle).toMatch(/107 at risk/)
    expect(a.rows[2]).toMatchObject({ roomId: '207', subtitle: 'Best: Priya · done 12:10' })
  })

  it('after the demo flags: 106, then 207 and 107 to assign, then the absorbed DND for your info', () => {
    const s = run(seedState(), mayaDnd, rosaDnd)
    const a = attention(s)
    expect(a.total).toBe(3)
    expect(a.counts).toEqual({ cant: 1, late: 0, assign: 2, waiting: 0 })
    expect(a.rows.map((r) => r.id)).toEqual(['cant-106', 'assign-207', 'assign-107', `info-${inbox(s).info[0].id}`])
    expect(a.rows[3].title).toBe('Maya moved 305 to 12:00')
  })

  it('blocked rooms count, and sit after to assign and before for your info', () => {
    const s = run(seedState(), { type: 'flag', roomId: '302', reason: 'broken', issue: 'light' })
    const a = attention(s)
    expect(a.counts.waiting).toBe(1)
    expect(kinds(s)).toEqual(['cant', 'late', 'assign', 'waiting', 'info'])
    expect(a.rows.find((r) => r.kind === 'waiting')).toMatchObject({ roomId: '302', title: '302 waiting on a fix' })
  })

  it('counts always add up to roomsNeedingAttention()', () => {
    const states = [
      seedState(),
      run(seedState(), mayaDnd, rosaDnd),
      run(seedState(), mayaDnd, rosaDnd, { type: 'assignAll' }),
      run(seedState(), { type: 'flag', roomId: '302', reason: 'broken', issue: 'leak' }),
      run(seedState(), { type: 'advanceClock', minutes: 60 }),
    ]
    for (const s of states) {
      expect(sum(s)).toBe(roomsNeedingAttention(s))
      expect(attention(s).total).toBe(roomsNeedingAttention(s))
    }
  })

  it('after Assign all: only 106 is left (3 → 1)', () => {
    const s = run(seedState(), mayaDnd, rosaDnd, { type: 'assignAll' })
    expect(attention(s).total).toBe(1)
    expect(kinds(s).filter((k) => k !== 'info')).toEqual(['cant'])
  })
})
