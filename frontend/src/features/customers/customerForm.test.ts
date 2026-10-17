import { describe, expect, it } from 'vitest'
import { phoneError, prefillFromSearch } from './customerForm'

describe('prefillFromSearch', () => {
  it('a phone number from the search goes to "Handy", the rest is the name', () => {
    expect(prefillFromSearch('079 123 45 67')).toEqual({ lastName: '', mobile: '079 123 45 67' })
    expect(prefillFromSearch(' Muster ')).toEqual({ lastName: 'Muster', mobile: '' })
    expect(prefillFromSearch('123')).toEqual({ lastName: '123', mobile: '' })
  })
})

describe('phoneError', () => {
  it('only phone characters', () => {
    expect(phoneError('+41 79 123 45 67')).toBeUndefined()
    expect(phoneError('')).toBeUndefined()
    expect(phoneError('079 abc')).toBe('Nur Ziffern, Leerzeichen und + / ( ) -')
  })
})
