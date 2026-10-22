import { describe, expect, it } from 'vitest'
import { ageStatus, parseYearOrDot, tireAge } from './tireAge'

const TODAY = '2026-10-22'

describe('tire age (FB-12)', () => {
  it('below 8 years fine, from 8 orange, from 10 red', () => {
    expect(tireAge(2019, TODAY)).toBe(7)
    expect(ageStatus(2019, TODAY)).toBe('ok')
    expect(ageStatus(2018, TODAY)).toBe('old')
    expect(ageStatus(2017, TODAY)).toBe('old')
    expect(ageStatus(2016, TODAY)).toBe('tooOld')
    expect(ageStatus(null, TODAY)).toBe('unknown')
  })

  it('the year typed, or a DOT code', () => {
    expect(parseYearOrDot('2022', TODAY)).toBe(2022)
    // week 23 of 2021
    expect(parseYearOrDot('2321', TODAY)).toBe(2021)
    expect(parseYearOrDot('0519', TODAY)).toBe(2019)
    expect(parseYearOrDot(' ', TODAY)).toBeNull()
    expect(parseYearOrDot('22', TODAY)).toBeNaN()
    // week 60 does not exist, a year 2099 not yet
    expect(parseYearOrDot('6021', TODAY)).toBeNaN()
    expect(parseYearOrDot('0199', TODAY)).toBeNaN()
  })
})
