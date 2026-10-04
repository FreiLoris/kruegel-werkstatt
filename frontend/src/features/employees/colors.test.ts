import { describe, expect, it } from 'vitest'
import { COLOR_SUGGESTIONS, freeColor, textOn } from './colors'

describe('textOn', () => {
  it('chooses dark text on light colors', () => {
    expect(textOn('#ffffff')).toBe('dark')
    expect(textOn('#f6d860')).toBe('dark')
  })

  it('chooses light text on dark colors', () => {
    expect(textOn('#000000')).toBe('light')
    expect(textOn('#1e3a8a')).toBe('light')
  })

  it('accepts upper and lower case', () => {
    expect(textOn('#1E3A8A')).toBe('light')
  })

  it('rejects invalid colors', () => {
    expect(() => textOn('red')).toThrow()
  })

  it('all suggestions read well with dark text', () => {
    for (const color of COLOR_SUGGESTIONS) {
      expect(textOn(color.value), color.name).toBe('dark')
    }
  })
})

describe('freeColor', () => {
  it('takes the first color not yet taken', () => {
    expect(freeColor(['#F6D860', '#ffb366'])).toBe(COLOR_SUGGESTIONS[2].value)
  })

  it('starts over when all are taken', () => {
    expect(freeColor(COLOR_SUGGESTIONS.map((c) => c.value))).toBe(COLOR_SUGGESTIONS[0].value)
  })
})
