import { describe, expect, it } from 'vitest'
import { dashboardMonday } from './shownWeek'

describe('dashboardMonday', () => {
  it('this week from Monday to Friday', () => {
    expect(dashboardMonday('2026-10-05')).toBe('2026-10-05')
    expect(dashboardMonday('2026-10-09')).toBe('2026-10-05')
  })

  it('the coming week on Saturday and Sunday', () => {
    expect(dashboardMonday('2026-10-10')).toBe('2026-10-12')
    expect(dashboardMonday('2026-10-11')).toBe('2026-10-12')
  })
})
