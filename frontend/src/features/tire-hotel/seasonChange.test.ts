import { describe, expect, it } from 'vitest'
import { byGroup, counters, daysUntil, formatDeadline, groupTitle, parseDeadline, seasonTitle } from './seasonChange'
import type { SeasonEntry } from './tireSeasonApi'

// fictitious
const entry = (group: SeasonEntry['group']) => ({ group }) as SeasonEntry

describe('season change (FB-21)', () => {
  const entries = [entry('CHANGED'), entry('OPEN'), entry('CHANGED'), entry('ACKNOWLEDGED'), entry('OPEN'), entry('PLANNED')]

  it('the counters at the top', () => {
    expect(counters({ entries, overdue: false })).toBe('2 gewechselt · 1 geplant · 1 quittiert · 2 offen')
    expect(counters({ entries: [...entries, entry('LONG_STORED')], overdue: true })).toBe(
      '2 gewechselt · 1 geplant · 1 quittiert · 2 vergessen · 1 länger nicht abgeholt',
    )
  })

  it('the groups to call first, the done ones last – empty ones left out', () => {
    expect(byGroup(entries).map((g) => `${g.group}:${g.entries.length}`)).toEqual(['OPEN:2', 'PLANNED:1', 'ACKNOWLEDGED:1', 'CHANGED:2'])
  })

  it('after the deadline "Offen" is "Vergessen"', () => {
    expect(groupTitle('OPEN', false)).toBe('Offen')
    expect(groupTitle('OPEN', true)).toBe('Vergessen')
  })

  it('the season by the year of its deadline', () => {
    expect(seasonTitle({ season: 'WINTER', deadline: '2026-12-01' })).toBe('Wintersaison 2026')
    expect(seasonTitle({ season: 'SUMMER', deadline: '2027-06-01' })).toBe('Sommersaison 2027')
  })

  it('days to the deadline', () => {
    expect(daysUntil('2026-12-01', '2026-10-23')).toBe(39)
    expect(daysUntil('2026-12-01', '2026-12-03')).toBe(-2)
  })

  it('deadlines typed the Swiss way', () => {
    expect(parseDeadline('1.6.')).toBe('06-01')
    expect(parseDeadline(' 01.12 ')).toBe('12-01')
    expect(parseDeadline('')).toBeNull()
    expect(parseDeadline('31.4.')).toBeUndefined()
    expect(parseDeadline('29.2.')).toBeUndefined()
    expect(parseDeadline('Juni')).toBeUndefined()
    expect(formatDeadline('06-01')).toBe('1.6.')
  })
})
