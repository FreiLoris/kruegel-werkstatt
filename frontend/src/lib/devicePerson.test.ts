import { afterEach, describe, expect, it, vi } from 'vitest'
import { choose, deviceChoice, personIdForRequests, resetChoice, subscribe } from './devicePerson'

afterEach(() => {
  localStorage.clear()
})

describe('devicePerson', () => {
  it('is empty at first', () => {
    expect(deviceChoice()).toBeNull()
    expect(personIdForRequests()).toBeUndefined()
  })

  it('remembers the chosen person', () => {
    choose({ kind: 'person', id: 'abc' })

    expect(deviceChoice()).toEqual({ kind: 'person', id: 'abc' })
    expect(personIdForRequests()).toBe('abc')
  })

  it('sends no person in "view only" mode', () => {
    choose({ kind: 'viewOnly' })

    expect(deviceChoice()).toEqual({ kind: 'viewOnly' })
    expect(personIdForRequests()).toBeUndefined()
  })

  it('returns the same object as long as nothing changes (otherwise React re-renders endlessly)', () => {
    choose({ kind: 'person', id: 'abc' })
    expect(deviceChoice()).toBe(deviceChoice())
  })

  it('treats a broken entry like "nothing chosen"', () => {
    localStorage.setItem('workshop.devicePerson', '{broken')
    expect(deviceChoice()).toBeNull()
  })

  it('notifies on choose and reset', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribe(onChange)

    choose({ kind: 'viewOnly' })
    resetChoice()
    unsubscribe()
    choose({ kind: 'viewOnly' })

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(deviceChoice()).toEqual({ kind: 'viewOnly' })
  })
})
