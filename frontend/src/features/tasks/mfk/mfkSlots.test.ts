import { describe, expect, it } from 'vitest'
import type { AnyTask } from '../taskApi'
import { mfkSlotsOf, mfkSlotsOn } from './mfkSlots'

const task = (id: string, mfkAppointment: string | null, mfkMinutes: number | null = 60, mfk = true) =>
  ({ id, mfk, mfkAppointment, mfkMinutes }) as AnyTask

describe('mfkSlotsOf', () => {
  it('the known MFK appointments by time, as long as the trip', () => {
    const slots = mfkSlotsOf([
      task('later', '2026-10-16T08:00:00'),
      task('open', null),
      task('soon', '2026-10-15T10:00:00', 90),
      task('none', null, null, false),
    ])

    expect(slots.map((s) => [s.task.id, s.date, s.start, s.end])).toEqual([
      ['soon', '2026-10-15', '10:00', '11:30'],
      ['later', '2026-10-16', '08:00', '09:00'],
    ])
    expect(mfkSlotsOn(slots, '2026-10-16').map((s) => s.task.id)).toEqual(['later'])
  })

  it('an old task without a duration takes an hour; a late one ends with the day', () => {
    expect(mfkSlotsOf([task('old', '2026-10-15T10:00:00', null)])[0].end).toBe('11:00')
    expect(mfkSlotsOf([task('late', '2026-10-15T23:30:00', 60)])[0].end).toBe('24:00')
  })
})
