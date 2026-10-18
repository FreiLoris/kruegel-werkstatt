import { describe, expect, it } from 'vitest'
import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('first and last word, or the first two letters of a single name', () => {
    expect(initialsOf('Reto Muster')).toBe('RM')
    expect(initialsOf('Anna Maria Beispiel')).toBe('AB')
    expect(initialsOf('sandra')).toBe('SA')
    expect(initialsOf('  ')).toBe('')
  })
})
