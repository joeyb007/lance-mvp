import { describe, expect, it } from 'vitest'
import { reducer } from '../../domain/reducer'
import { seedState } from '../../domain/seed'
import { roomsFor } from '../../domain/selectors'
import type { HousekeeperId, State } from '../../domain/types'
import { roomTags } from './tags'

const texts = (s: State, hk: HousekeeperId, roomId: string) => {
  const p = roomsFor(s, hk).find((x) => x.room.id === roomId)!
  return roomTags(p, s.now, s.housekeepers[hk].shiftEnd).map((t) => t.text)
}

describe('housekeeper card tags', () => {
  it('Maya 305 DND 12:00 → "Available at 12:00"', () => {
    const s = reducer(seedState(), { type: 'flag', roomId: '305', reason: 'dnd', until: 720 })
    expect(texts(s, 'maya', '305')).toEqual(['Available at 12:00'])
  })

  it("Rosa's 107 at load runs past 1:00 (amber: she can hand it off, not an alarm)", () => {
    const s = seedState()
    expect(texts(s, 'rosa', '107')).toEqual(['Runs past 1:00'])
    const p = roomsFor(s, 'rosa').find((x) => x.room.id === '107')!
    expect(roomTags(p, s.now, s.housekeepers.rosa.shiftEnd)[0].tone).toBe('amber')
  })

  it('Priya gets 107 from Jordan, available 11:30 → ready now after skipping to 11:30', () => {
    let s = reducer(seedState(), { type: 'flag', roomId: '107', reason: 'dnd', until: 690 })
    s = reducer(s, { type: 'assignAll' })
    expect(texts(s, 'priya', '107')).toEqual(['From Jordan · available 11:30'])
    expect(texts(s, 'priya', '207')).toEqual(['From Jordan'])
    s = reducer(s, { type: 'advanceClock', minutes: 60 })
    expect(texts(s, 'priya', '107')).toEqual(['From Jordan · ready now'])
  })
})
