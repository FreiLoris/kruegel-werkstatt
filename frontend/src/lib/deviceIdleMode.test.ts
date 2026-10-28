import { afterEach, describe, expect, it } from 'vitest'
import { idleMode, setIdleMode } from './deviceIdleMode'

describe('deviceIdleMode (FB-29)', () => {
  afterEach(() => localStorage.clear())

  it('locks by default – the office PCs', () => {
    expect(idleMode()).toBe('lock')
  })

  it('remembers the mode of the device', () => {
    setIdleMode('viewOnly')
    expect(idleMode()).toBe('viewOnly')
    setIdleMode('never')
    expect(idleMode()).toBe('never')
    setIdleMode('lock')
    expect(localStorage.getItem('workshop.idleMode')).toBeNull()
  })

  it('an unknown value is the default', () => {
    localStorage.setItem('workshop.idleMode', 'kaputt')
    expect(idleMode()).toBe('lock')
  })
})
