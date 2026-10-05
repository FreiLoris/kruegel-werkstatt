import { describe, expect, it } from 'vitest'
import { dueState } from './todoDue'

describe('dueState', () => {
  it('overdue before today, today, later, or no deadline', () => {
    expect(dueState('2026-10-14', '2026-10-15')).toBe('overdue')
    expect(dueState('2026-10-15', '2026-10-15')).toBe('today')
    expect(dueState('2026-10-16', '2026-10-15')).toBe('later')
    expect(dueState(null, '2026-10-15')).toBe('none')
  })
})
