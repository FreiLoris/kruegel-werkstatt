import type { SeasonChange, SeasonEntry, SeasonGroup } from './tireSeasonApi'

/** The groups in the order they are worked through – the ones to call first, the done ones last */
export const GROUP_ORDER: readonly SeasonGroup[] = ['OPEN', 'PLANNED', 'LONG_STORED', 'ACKNOWLEDGED', 'CHANGED']

/** Group titles; "Offen" becomes "Vergessen" after the deadline */
export function groupTitle(group: SeasonGroup, overdue: boolean): string {
  switch (group) {
    case 'OPEN':
      return overdue ? 'Vergessen' : 'Offen'
    case 'PLANNED':
      return 'Termin geplant'
    case 'LONG_STORED':
      return 'Länger nicht abgeholt'
    case 'ACKNOWLEDGED':
      return 'Quittiert'
    case 'CHANGED':
      return 'Gewechselt'
  }
}

/** "Wintersaison 2026" – the year of its deadline */
export function seasonTitle(season: Pick<SeasonChange, 'season' | 'deadline'>): string {
  return `${season.season === 'WINTER' ? 'Winter' : 'Sommer'}saison ${season.deadline.slice(0, 4)}`
}

/** The entries per group, in {@link GROUP_ORDER}; empty groups left out */
export function byGroup(entries: readonly SeasonEntry[]): { group: SeasonGroup; entries: SeasonEntry[] }[] {
  return GROUP_ORDER.map((group) => ({ group, entries: entries.filter((e) => e.group === group) })).filter((g) => g.entries.length > 0)
}

/** "12 gewechselt · 5 geplant · 2 quittiert · 38 offen" – the progress of the season (FB-21) */
export function counters(change: Pick<SeasonChange, 'entries' | 'overdue'>): string {
  const count = (group: SeasonGroup) => change.entries.filter((e) => e.group === group).length
  const parts = [
    `${count('CHANGED')} gewechselt`,
    `${count('PLANNED')} geplant`,
    `${count('ACKNOWLEDGED')} quittiert`,
    `${count('OPEN')} ${change.overdue ? 'vergessen' : 'offen'}`,
  ]
  const long = count('LONG_STORED')
  if (long > 0) parts.push(`${long} länger nicht abgeholt`)
  return parts.join(' · ')
}

/** Days from `today` to the deadline; negative = over */
export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000)
}

/**
 * A deadline as typed – "1.6.", "01.06" or "1.6" – as sent: "06-01". Null = empty, NaN-like
 * `undefined` = not a day (29 February neither: it is not there every year).
 */
export function parseDeadline(text: string): string | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const match = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(trimmed)
  if (!match) return undefined
  const [day, month] = [Number(match[1]), Number(match[2])]
  // a leap year, so every real day exists
  const date = new Date(Date.UTC(2000, month - 1, day))
  if (month < 1 || month > 12 || date.getUTCMonth() !== month - 1 || (day === 29 && month === 2)) return undefined
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "06-01" → "1.6." */
export function formatDeadline(monthDay: string): string {
  const [month, day] = monthDay.split('-').map(Number)
  return `${day}.${month}.`
}
