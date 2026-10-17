import { describe, expect, it } from 'vitest'
import { wholeNumberError } from './wholeNumber'

describe('wholeNumberError', () => {
  it('a whole number or nothing is fine', () => {
    expect(wholeNumberError('25')).toBeUndefined()
    expect(wholeNumberError(' 4 ')).toBeUndefined()
    expect(wholeNumberError('')).toBeUndefined()
  })

  it('says so instead of turning "2,5" into 25', () => {
    expect(wholeNumberError('2,5')).toBe('Nur ganze Zahlen – ohne Komma')
    expect(wholeNumberError('22.5')).toBe('Nur ganze Zahlen – ohne Komma')
    expect(wholeNumberError('abc')).toBe('Nur Ziffern')
    expect(wholeNumberError('61', 60)).toBe('Höchstens 60')
  })
})
