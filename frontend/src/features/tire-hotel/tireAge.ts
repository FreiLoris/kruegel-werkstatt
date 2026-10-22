/**
 * The age of tyres (FB-12, decided by the workshop): below 8 years fine, from 8 orange, from 10 red –
 * independent of the tread. The year is enough; a DOT code ("2321" = week 23 of 2021) gives it too.
 * Pure functions, tested.
 */
export type AgeStatus = 'ok' | 'old' | 'tooOld' | 'unknown'

export const AGE_OLD = 8
export const AGE_TOO_OLD = 10
const YEAR_MIN = 1990

/** Years since the year of manufacture; empty = unknown */
export function tireAge(year: number | null | undefined, today: string): number | null {
  return year == null ? null : Number(today.slice(0, 4)) - year
}

export function ageStatus(year: number | null | undefined, today: string): AgeStatus {
  const age = tireAge(year, today)
  if (age === null) return 'unknown'
  if (age >= AGE_TOO_OLD) return 'tooOld'
  if (age >= AGE_OLD) return 'old'
  return 'ok'
}

export const AGE_TEXT: Record<AgeStatus, string> = {
  ok: 'Alter gut',
  old: 'älter – ansprechen',
  tooOld: 'zu alt – ersetzen',
  unknown: 'Alter unbekannt',
}

/**
 * "2022" (year) or "2321" (DOT: week 23 of 2021) → the year; '' → null; anything else → NaN.
 * A plausible year wins – a DOT read as a year would be in the future or before 1990.
 */
export function parseYearOrDot(text: string, today: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!/^\d{4}$/.test(trimmed)) return NaN
  const thisYear = Number(today.slice(0, 4))
  const asYear = Number(trimmed)
  if (asYear >= YEAR_MIN && asYear <= thisYear) return asYear
  const week = Number(trimmed.slice(0, 2))
  const fromDot = 2000 + Number(trimmed.slice(2))
  return week >= 1 && week <= 53 && fromDot <= thisYear ? fromDot : NaN
}
