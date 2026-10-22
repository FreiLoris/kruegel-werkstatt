import type { CustomerStepValue } from '../tasks/wizard/wizardState'
import type { DepthsRequest, RimKind, Season, TireSet, TireSetKind, TireSetRequest } from './tireHotelApi'
import { WHEELS, type Wheel } from './tread'

/**
 * Storing a set or editing its data, as form state: text while typing, '' = empty. Pure functions
 * below – tested without rendering anything.
 */
export interface TireSetForm {
  season: Season | ''
  kind: TireSetKind | ''
  rims: RimKind | ''
  hubCaps: boolean
  /** "Radschrauben beachten" (FB-17): special bolts – look for the matching ones in the car */
  wheelBolts: boolean
  brand: string
  model: string
  dimension: string
  /** year of manufacture from the DOT code, e.g. "2022" */
  year: string
  remark: string
  /** FB-11: torque of the wheel bolts in Nm, e.g. "120" */
  torque: string
  /** FB-11: tyre pressure in bar, "2,5" or "2.5" */
  pressureFront: string
  pressureRear: string
  /** "Alle vier gleich": one field for all wheels – a new set usually has the same depth everywhere */
  sameDepth: boolean
  /** in mm, "6,5" or "6.5" */
  depths: Record<Wheel, string>
}

/**
 * A new set. The season is preset by the time of year: in autumn the summer tyres come in, in
 * spring the winter tyres – one choice less in the busy weeks of the tyre change.
 */
export function emptyForm(today: string): TireSetForm {
  const month = Number(today.slice(5, 7))
  return {
    season: month >= 8 || month <= 1 ? 'SUMMER' : 'WINTER',
    kind: '',
    rims: '',
    hubCaps: false,
    wheelBolts: false,
    brand: '',
    model: '',
    dimension: '',
    year: '',
    remark: '',
    torque: '',
    pressureFront: '',
    pressureRear: '',
    sameDepth: true,
    depths: { frontLeft: '', frontRight: '', rearLeft: '', rearRight: '' },
  }
}

/** "6,5" → 6.5, "" → null; anything else → NaN (an error at the field) */
export function parseDepth(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (!trimmed) return null
  // a tenth is what the gauge shows – "4,25" is rounded instead of refused (UX M-19)
  return /^\d{1,2}(\.\d+)?$/.test(trimmed) ? Math.round(Number(trimmed) * 10) / 10 : NaN
}

/** Valid but unusual – a soft hint below the field, saving stays possible (UX M-19) */
export function depthWarning(depth: number | null): string | undefined {
  if (depth === null || Number.isNaN(depth)) return undefined
  if (depth === 0) return '0 mm – wirklich? Sonst Feld leer lassen'
  if (depth > 10) return 'Ungewöhnlich viel – Tippfehler?'
  return undefined
}

/** The depth of one wheel typed – with "alle vier gleich" it is the depth of all of them. */
export function withDepth(form: TireSetForm, wheel: Wheel, text: string): TireSetForm {
  const depths = form.sameDepth
    ? { frontLeft: text, frontRight: text, rearLeft: text, rearRight: text }
    : { ...form.depths, [wheel]: text }
  return { ...form, depths }
}

/** "Alle vier gleich" ticked: all take the depth of the first wheel; unticked, each keeps it. */
export function withSameDepth(form: TireSetForm, on: boolean): TireSetForm {
  if (!on) return { ...form, sameDepth: false }
  const first = form.depths.frontLeft
  return { ...form, sameDepth: true, depths: { frontLeft: first, frontRight: first, rearLeft: first, rearRight: first } }
}

/** Complete wheels or only tyres – only wheels have rims. */
export function withKind(form: TireSetForm, kind: TireSetKind | ''): TireSetForm {
  return { ...form, kind, rims: kind === 'WHEELS' ? form.rims : '' }
}

export type TireSetErrors = Partial<Record<'season' | 'kind' | 'year' | 'torque' | 'pressureFront' | 'pressureRear' | Wheel, string>>

const YEAR_MIN = 1990
const TORQUE_MIN = 10
const TORQUE_MAX = 999
const PRESSURE_MIN = 0.5
const PRESSURE_MAX = 9.99

/** "120" → 120, "" → null; anything else → NaN */
export function parseTorque(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return /^\d{1,3}$/.test(trimmed) ? Number(trimmed) : NaN
}

/** "2,5" → 2.5, "" → null; more than two decimals or anything else → NaN */
export function parsePressure(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (!trimmed) return null
  return /^\d(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : NaN
}

export function tireSetErrors(form: TireSetForm, today: string): TireSetErrors {
  const errors: TireSetErrors = {}
  if (!form.season) errors.season = 'Saison wählen'
  if (!form.kind) errors.kind = 'Kompletträder oder nur Reifen?'
  if (form.year.trim()) {
    const year = Number(form.year.trim())
    if (!/^\d{4}$/.test(form.year.trim()) || year < YEAR_MIN || year > Number(today.slice(0, 4))) {
      errors.year = `Jahrgang zwischen ${YEAR_MIN} und heute, z. B. 2022`
    }
  }
  const torque = parseTorque(form.torque)
  if (Number.isNaN(torque) || (torque !== null && (torque < TORQUE_MIN || torque > TORQUE_MAX))) errors.torque = 'in Nm, z. B. 120'
  for (const field of ['pressureFront', 'pressureRear'] as const) {
    const pressure = parsePressure(form[field])
    if (Number.isNaN(pressure) || (pressure !== null && (pressure < PRESSURE_MIN || pressure > PRESSURE_MAX))) errors[field] = 'in bar, z. B. 2,5'
  }
  for (const { key } of WHEELS) {
    const depth = parseDepth(form.depths[key])
    if (Number.isNaN(depth) || (depth !== null && depth > 20)) errors[key] = 'in mm, z. B. 6,5'
  }
  return errors
}

/** The typed depths to send – a wheel not measured is left out */
export function depthsOf(form: TireSetForm): DepthsRequest {
  const value = (wheel: Wheel) => parseDepth(form.depths[wheel]) ?? undefined
  return { frontLeft: value('frontLeft'), frontRight: value('frontRight'), rearLeft: value('rearLeft'), rearRight: value('rearRight') }
}

/** Form → JSON for POST/PUT /api/tire-sets. The depths are only taken when storing (`version` empty). */
export function toTireSetRequest(step1: CustomerStepValue, form: TireSetForm, version?: number): TireSetRequest {
  if (!step1.customer || !form.season || !form.kind) throw new Error('Form not complete')
  const text = (value: string) => value.trim() || undefined
  return {
    customerId: step1.customer.id,
    vehicleId: step1.vehicle?.kind === 'vehicle' ? step1.vehicle.vehicle.id : undefined,
    season: form.season,
    kind: form.kind,
    rims: form.kind === 'WHEELS' && form.rims ? form.rims : undefined,
    hubCaps: form.hubCaps,
    wheelBolts: form.wheelBolts,
    brand: text(form.brand),
    model: text(form.model),
    dimension: text(form.dimension),
    year: form.year.trim() ? Number(form.year.trim()) : undefined,
    remark: text(form.remark),
    ...mountingOf(form),
    depths: version === undefined ? depthsOf(form) : undefined,
    version,
  }
}

/** The typed torque and pressures to send – empty ones are left out */
export function mountingOf(form: TireSetForm) {
  return {
    torque: parseTorque(form.torque) ?? undefined,
    pressureFront: parsePressure(form.pressureFront) ?? undefined,
    pressureRear: parsePressure(form.pressureRear) ?? undefined,
  }
}

export type Mounting = Pick<TireSetForm, 'torque' | 'pressureFront' | 'pressureRear'>

export const NO_MOUNTING: Mounting = { torque: '', pressureFront: '', pressureRear: '' }

/** 2.5 → "2,5", empty → '' – a number back into a field */
const numberText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value).replace('.', ','))

const mountingOfSet = (set: TireSet): Mounting => ({
  torque: numberText(set.torque),
  pressureFront: numberText(set.pressureFront),
  pressureRear: numberText(set.pressureRear),
})

/**
 * Torque and pressures rarely change for a car (FB-11): proposed from its newest set that has them –
 * one of the same season first (summer and winter wheels may differ). Empty when none has them.
 */
export function mountingProposal(setsOfVehicle: TireSet[], season: Season | ''): Mounting {
  const known = setsOfVehicle
    .filter((s) => s.torque != null || s.pressureFront != null || s.pressureRear != null)
    .sort((a, b) => b.storedOn.localeCompare(a.storedOn))
  const best = known.find((s) => s.season === season) ?? known[0]
  return best ? mountingOfSet(best) : NO_MOUNTING
}

/**
 * Another proposal (other car, other season, the car's sets just loaded): it replaces the values as
 * long as they are still the old proposal (or empty) – what was typed stays.
 */
export function withMountingProposal(form: TireSetForm, before: Mounting, after: Mounting): TireSetForm {
  const same = (a: Mounting, b: Mounting) => a.torque === b.torque && a.pressureFront === b.pressureFront && a.pressureRear === b.pressureRear
  return same(form, before) || same(form, NO_MOUNTING) ? { ...form, ...after } : form
}

/** A saved set back into the form – for editing its data. */
export function formFromSet(set: TireSet): TireSetForm {
  const d = set.depths
  return {
    season: set.season,
    kind: set.kind,
    rims: set.rims ?? '',
    hubCaps: set.hubCaps,
    wheelBolts: set.wheelBolts,
    brand: set.brand ?? '',
    model: set.model ?? '',
    dimension: set.dimension ?? '',
    year: set.year?.toString() ?? '',
    remark: set.remark ?? '',
    ...mountingOfSet(set),
    sameDepth: d.frontLeft === d.frontRight && d.frontLeft === d.rearLeft && d.frontLeft === d.rearRight,
    depths: { frontLeft: numberText(d.frontLeft), frontRight: numberText(d.frontRight), rearLeft: numberText(d.rearLeft), rearRight: numberText(d.rearRight) },
  }
}
