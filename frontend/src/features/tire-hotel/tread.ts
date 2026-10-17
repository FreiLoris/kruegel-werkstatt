import type { Season, TireSetEvent, TreadDepths, TreadLimits } from './tireHotelApi'

/**
 * Tread depths judged against the limits of the settings (FB-07): fine, worth a word with the
 * customer ("ansprechen"), below the legal minimum – or not measured. Pure functions, tested.
 */
export type TreadStatus = 'ok' | 'advise' | 'illegal' | 'unknown'

export type Wheel = keyof TreadDepths

/** In the order of the car seen from above: front left, front right, rear left, rear right */
export const WHEELS: { key: Wheel; short: string; label: string }[] = [
  { key: 'frontLeft', short: 'VL', label: 'Vorne links' },
  { key: 'frontRight', short: 'VR', label: 'Vorne rechts' },
  { key: 'rearLeft', short: 'HL', label: 'Hinten links' },
  { key: 'rearRight', short: 'HR', label: 'Hinten rechts' },
]

export const NO_DEPTHS: TreadDepths = { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null }

/** All-season tyres are driven in winter – they count like winter tyres. */
function limitFor(season: Season, limits: Pick<TreadLimits, 'summerMm' | 'winterMm'>): number {
  return season === 'SUMMER' ? limits.summerMm : limits.winterMm
}

export function treadStatus(depth: number | null | undefined, season: Season, limits: Pick<TreadLimits, 'summerMm' | 'winterMm' | 'minimumMm'>): TreadStatus {
  if (depth === null || depth === undefined) return 'unknown'
  if (depth < limits.minimumMm) return 'illegal'
  if (depth < limitFor(season, limits)) return 'advise'
  return 'ok'
}

const SEVERITY: TreadStatus[] = ['unknown', 'ok', 'advise', 'illegal']

/** The worst of the four – what the list shows for a set */
export function worstStatus(depths: TreadDepths, season: Season, limits: TreadLimits): TreadStatus {
  return WHEELS.map((w) => treadStatus(depths[w.key], season, limits)).reduce((a, b) => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a), 'unknown')
}

/** The wheels worth a word with the customer, e.g. ["VL", "VR"] – for the hint "Kunde auf neue Reifen ansprechen" */
export function wheelsToAdvise(depths: TreadDepths, season: Season, limits: TreadLimits): string[] {
  return WHEELS.filter((w) => {
    const status = treadStatus(depths[w.key], season, limits)
    return status === 'advise' || status === 'illegal'
  }).map((w) => w.short)
}

/** "6.5" → "6,5 mm"; not measured → "–" */
export function formatDepth(depth: number | null | undefined): string {
  return depth === null || depth === undefined ? '–' : `${depth.toFixed(1).replace('.', ',')} mm`
}

export const STATUS_TEXT: Record<TreadStatus, string> = {
  ok: 'gut',
  advise: 'ansprechen',
  illegal: 'unter gesetzlichem Minimum',
  unknown: 'nicht gemessen',
}

/**
 * Wheels whose depth was not measured with the latest measurement – it comes from an earlier one
 * (a partial measurement keeps the others, decision E7). Grouped by the day it was measured, oldest first.
 * Only storing and measuring count: a move or retrieval just repeats the depths of that moment.
 */
export function olderDepths(history: TireSetEvent[]): { wheels: string[]; on: string }[] {
  const measuredOn = new Map<Wheel, string>()
  const measurements = history
    .filter((e) => e.kind === 'STORED' || e.kind === 'MEASURED')
    .sort((a, b) => a.happenedOn.localeCompare(b.happenedOn))
  for (const event of measurements) {
    for (const w of WHEELS) {
      if (event.depths[w.key] != null) measuredOn.set(w.key, event.happenedOn)
    }
  }
  const latest = [...measuredOn.values()].sort().at(-1)
  const older = new Map<string, string[]>()
  for (const w of WHEELS) {
    const on = measuredOn.get(w.key)
    if (on && on !== latest) older.set(on, [...(older.get(on) ?? []), w.short])
  }
  return [...older.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([on, wheels]) => ({ wheels, on }))
}

