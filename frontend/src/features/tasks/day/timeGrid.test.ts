import { describe, expect, it } from 'vitest'
import type { Task } from '../taskApi'
import { blockingIn, movedTo, placeInColumn, resizedTo, selection, snap, spanOn, timeOf, visibleRange, withSchedule } from './timeGrid'

const DAY = '2026-10-15'
const task = (id: string, time: string, endAt: string, date = DAY) =>
  ({ id, date, time: `${time}:00`, endAt: `${endAt}:00`, liftId: 'l1', arrivesEarlier: null, readyBy: null }) as Task

describe('spanOn and visibleRange', () => {
  it('a task over several days fills the day before and after', () => {
    const waiting = task('w', '10:00', '2026-10-16T12:00', '2026-10-14')

    expect(spanOn(waiting, DAY)).toEqual({ start: 0, end: 1440, startsBefore: true, endsAfter: true })
    expect(spanOn(waiting, '2026-10-16')).toMatchObject({ start: 0, end: 720, endsAfter: false })
  })

  it('the working day, widened to full hours – not by tasks that only go on from another day', () => {
    expect(visibleRange([], DAY)).toEqual({ start: 420, end: 1080 })
    expect(visibleRange([task('a', '06:30', `${DAY}T19:15`)], DAY)).toEqual({ start: 360, end: 1200 })
    expect(visibleRange([task('w', '10:00', '2026-10-16T12:00', '2026-10-14')], DAY)).toEqual({ start: 420, end: 1080 })
  })
})

describe('placeInColumn', () => {
  it('overlapping tasks share the width, the others take all of it', () => {
    const placed = placeInColumn(
      [task('a', '08:00', `${DAY}T10:00`), task('b', '09:00', `${DAY}T11:00`), task('c', '10:00', `${DAY}T10:30`), task('d', '12:00', `${DAY}T13:00`)],
      DAY,
    )
    const of = (id: string) => placed.find((p) => p.task.id === id)!

    expect([of('a').lane, of('b').lane, of('c').lane]).toEqual([0, 1, 0])
    expect(of('a').lanes).toBe(2)
    expect(of('d')).toMatchObject({ lane: 0, lanes: 1 })
  })
})

describe('drag results', () => {
  it('snaps to quarter hours and keeps 00:00–23:59', () => {
    expect(snap(487)).toBe(480)
    expect(snap(488)).toBe(495)
    expect(timeOf(510)).toBe('08:30')
    expect(timeOf(1440)).toBe('23:59')
  })

  it('moving keeps the duration – also into the next day', () => {
    const a = task('a', '08:00', `${DAY}T09:30`)

    expect(movedTo(a, 'l2', DAY, 600)).toEqual({ liftId: 'l2', date: DAY, time: '10:00', endAt: `${DAY}T11:30` })
    expect(movedTo(a, null, DAY, 23 * 60).endAt).toBe('2026-10-16T00:30')
  })

  it('resizing changes only the end, at least a quarter hour', () => {
    const a = task('a', '08:00', `${DAY}T09:00`)

    expect(resizedTo(a, DAY, 750)).toEqual({ liftId: 'l1', date: DAY, time: '08:00', endAt: `${DAY}T12:30` })
    expect(resizedTo(a, DAY, 420).endAt).toBe(`${DAY}T08:15`)
    // dragged on the next day of a task over two days
    expect(resizedTo(task('w', '10:00', '2026-10-16T12:00', '2026-10-14'), DAY, 1440).endAt).toBe('2026-10-16T00:00')
  })

  it('a selection gives start and end, a click the default hour', () => {
    expect(selection(DAY, 600, 510)).toEqual({ date: DAY, time: '08:30', endAt: `${DAY}T10:00` })
    expect(selection(DAY, 480, 480)).toEqual({ date: DAY, time: '08:00', endAt: `${DAY}T09:00` })
  })

  it('the task shows its new place right away, extra times move along with the day', () => {
    const a = { ...task('a', '08:00', `${DAY}T09:00`), readyBy: `${DAY}T16:00:00` }

    expect(withSchedule([a], 'a', { liftId: null, date: '2026-10-16', time: '08:00', endAt: '2026-10-16T09:00' })[0]).toMatchObject({
      liftId: null,
      date: '2026-10-16',
      time: '08:00:00',
      endAt: '2026-10-16T09:00:00',
      readyBy: '2026-10-16T16:00:00',
      arrivesEarlier: null,
    })
  })
})

describe('blockingIn', () => {
  it('touching is fine, overlapping is not, the moved task does not count', () => {
    const placed = placeInColumn([task('a', '08:00', `${DAY}T10:00`)], DAY)

    expect(blockingIn(placed, 600, 660)).toBeUndefined()
    expect(blockingIn(placed, 570, 660)?.task.id).toBe('a')
    expect(blockingIn(placed, 570, 660, 'a')).toBeUndefined()
  })
})
