import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mfkState } from './mfk'
import { MfkHint } from './MfkHint'

const TODAY = '2026-10-15'

describe('mfkState', () => {
  it('overdue only when the last inspection is known', () => {
    expect(mfkState({ lastMfk: '2024-03-01', nextMfk: '2026-03-01' }, TODAY)).toEqual({ kind: 'overdue', due: '2026-03-01' })
    // estimate from the first registration only, long past: no data rather than a real alarm
    expect(mfkState({ lastMfk: null, nextMfk: '2014-03-01' }, TODAY)).toEqual({ kind: 'unknown' })
  })

  it('soon within 60 days, ok after that', () => {
    expect(mfkState({ lastMfk: '2024-12-01', nextMfk: '2026-12-01' }, TODAY).kind).toBe('soon')
    expect(mfkState({ lastMfk: '2025-01-01', nextMfk: '2027-01-01' }, TODAY).kind).toBe('ok')
  })

  it('a new car without inspection yet is fine', () => {
    expect(mfkState({ lastMfk: null, nextMfk: '2029-05-01' }, TODAY).kind).toBe('ok')
  })

  it('nothing known', () => {
    expect(mfkState({ lastMfk: null, nextMfk: null }, TODAY)).toEqual({ kind: 'unknown' })
  })
})

describe('MfkHint', () => {
  it('warns in words with the estimated month', () => {
    render(<MfkHint vehicle={{ lastMfk: '2024-03-01', nextMfk: '2026-03-01' }} today={TODAY} />)

    expect(screen.getByText('MFK überfällig (voraussichtlich seit 03.2026)')).toBeTruthy()
  })
})
