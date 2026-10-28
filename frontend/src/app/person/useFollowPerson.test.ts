import { describe, expect, it } from 'vitest'
import { followed } from './useFollowPerson'

describe('followed (FB-29)', () => {
  it('an empty field or the previous person takes the new one – one chosen by hand stays', () => {
    expect(followed('', '', 'loris')).toBe('loris')
    expect(followed('reto', 'reto', 'loris')).toBe('loris')
    expect(followed('erich', 'reto', 'loris')).toBe('erich')
  })
})
