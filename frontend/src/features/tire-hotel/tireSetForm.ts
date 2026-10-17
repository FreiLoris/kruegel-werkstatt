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
  wheelBolts: boolean
  brand: string
  model: string
  dimension: string
  /** year of manufacture from the DOT code, e.g. "2022" */
  year: string
  remark: string
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

export type TireSetErrors = Partial<Record<'season' | 'kind' | 'year' | Wheel, string>>

const YEAR_MIN = 1990

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
    depths: version === undefined ? depthsOf(form) : undefined,
    version,
  }
}

const depthText = (depth: number | null | undefined) => (depth === null || depth === undefined ? '' : String(depth).replace('.', ','))

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
    sameDepth: d.frontLeft === d.frontRight && d.frontLeft === d.rearLeft && d.frontLeft === d.rearRight,
    depths: { frontLeft: depthText(d.frontLeft), frontRight: depthText(d.frontRight), rearLeft: depthText(d.rearLeft), rearRight: depthText(d.rearRight) },
  }
}
