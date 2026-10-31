// Problem sheet reasons beyond DND / broken: "Can't get in" and "Other…" (the only typed input).
import { describe, expect, it } from 'vitest'
import { seedState } from './seed'
import { reducer } from './reducer'
import { queue, recommendation, roomsFor } from './selectors'
import type { Action, HousekeeperId, State } from './types'

const t = (h: number, m = 0) => h * 60 + m
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s)
const ids = (s: State, hk: HousekeeperId) => roomsFor(s, hk).map((p) => p.room.id)
const label = (s: State, roomId: string) => queue(s).find((q) => q.room.id === roomId)!.label
const strip = (s: State) => ({ ...s, undo: null, toast: null, seq: 0 })

describe("Can't get in", () => {
  const noAccess: Action = { type: 'flag', roomId: '104', reason: 'no_access' }

  it('leaves her list → queue (no_access), labelled, recommended, toast', () => {
    const s = run(seedState(), noAccess)
    expect(ids(s, 'rosa')).toEqual(['101', '105', '107'])
    expect(s.queue).toContain('104')
    expect(s.rooms['104']).toMatchObject({ ownerId: null, status: 'todo', queueReason: 'no_access', flaggedBy: 'rosa', queuedAt: t(10, 30) })
    expect(s.rooms['104'].availableAt).toBeUndefined()
    expect(label(s, '104')).toBe("Rosa can't get in")
    expect(recommendation(s, '104').type).toBe('pick')
    expect(s.events.at(-1)).toMatchObject({ kind: 'escalated', roomId: '104', by: 'rosa', reason: 'no_access' })
    expect(s.toast).toMatchObject({ title: '104 sent to Jordan', subtitle: "Can't get in · Jordan will pick someone", undoable: true })
  })

  it('is undoable', () => {
    const before = seedState()
    expect(strip(run(before, noAccess, { type: 'undo' }))).toEqual(strip(before))
  })
})

describe('Other… with a note', () => {
  const other = (note: string): Action => ({ type: 'flag', roomId: '302', reason: 'other', note })

  it('queue (other), note stored trimmed, label with curly quotes, toast subtitle = note', () => {
    const s = run(seedState(), other('  Mini fridge leaking '))
    expect(ids(s, 'maya')).not.toContain('302')
    expect(s.rooms['302']).toMatchObject({ ownerId: null, queueReason: 'other', flaggedBy: 'maya', note: 'Mini fridge leaking' })
    expect(label(s, '302')).toBe('Maya: “Mini fridge leaking”')
    expect(recommendation(s, '302').type).toBe('pick')
    expect(s.events.at(-1)).toMatchObject({ kind: 'escalated', roomId: '302', by: 'maya', reason: 'other', note: 'Mini fridge leaking' })
    expect(s.toast).toMatchObject({ title: '302 sent to Jordan', subtitle: 'Mini fridge leaking', undoable: true })
  })

  it('caps the note at 80 characters', () => {
    const s = run(seedState(), other('x'.repeat(200)))
    expect(s.rooms['302'].note).toHaveLength(80)
    // The toast carries the (capped) note; <Toast> clamps it to two lines visually.
    expect(s.toast?.subtitle).toBe('x'.repeat(80))
  })

  it('rejects an empty or whitespace note (state unchanged)', () => {
    const s = seedState()
    expect(run(s, other(''))).toBe(s)
    expect(run(s, other('   \n '))).toBe(s)
  })

  it('is undoable', () => {
    const before = seedState()
    expect(strip(run(before, other('Smoke smell'), { type: 'undo' }))).toEqual(strip(before))
  })
})

describe('Something broken → Other… with a note', () => {
  const brokenOther = (note: string): Action => ({ type: 'flag', roomId: '305', reason: 'broken', issue: 'other', note })

  it('raises a ticket with her note; room blocked in the queue, no recommendation', () => {
    const s = run(seedState(), brokenOther(' Shower drain blocked '))
    expect(ids(s, 'maya')).not.toContain('305')
    expect(s.tickets).toHaveLength(1)
    expect(s.tickets[0]).toMatchObject({ roomId: '305', issue: 'other', note: 'Shower drain blocked', raisedBy: 'maya' })
    expect(s.rooms['305']).toMatchObject({ ownerId: null, blocked: true, queueReason: 'broken' })
    const item = queue(s).find((q) => q.room.id === '305')!
    expect(item.recommendation).toBeNull()
    expect(item.label).toBe('Waiting on maintenance · Shower drain blocked')
    expect(s.toast).toMatchObject({ title: 'Ticket sent: 305 · Shower drain blocked', subtitle: 'Sam is on it · off your list', undoable: true })
  })

  it('rejects an empty note (state unchanged)', () => {
    const s = seedState()
    expect(run(s, brokenOther(''))).toBe(s)
    expect(run(s, brokenOther('  '))).toBe(s)
  })

  it('after markFixed it gets a recommendation', () => {
    let s = run(seedState(), brokenOther('Shower drain blocked'))
    s = run(s, { type: 'markFixed', ticketId: s.tickets[0].id })
    expect(s.rooms['305'].blocked).toBe(false)
    expect(recommendation(s, '305').type).toBe('pick')
    expect(label(s, '305')).toBe('Fixed · Shower drain blocked · ready to assign')
  })
})

describe('declined still works', () => {
  it('off the list, not in the queue', () => {
    const s = run(seedState(), { type: 'flag', roomId: '303', reason: 'declined' })
    expect(ids(s, 'maya')).not.toContain('303')
    expect(s.rooms['303']).toMatchObject({ status: 'declined', ownerId: null })
    expect(s.queue).not.toContain('303')
  })
})
