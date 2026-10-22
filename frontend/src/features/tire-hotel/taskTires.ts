import { KINDS, RIMS, SEASONS, type Season, type TaskTireBookingRequest, type TaskTires, type TireSet } from './tireHotelApi'
import {
  depthsOf,
  emptyForm,
  mountingOf,
  mountingProposal,
  tireSetErrors,
  withMountingProposal,
  type TireSetErrors,
  type TireSetForm,
} from './tireSetForm'
import { WHEELS } from './tread'

/**
 * The tyre change of a task in the tyre hotel (13q): what the task sheet prints, and booking it
 * once the wheels are changed. Pure functions, tested.
 */

/** "Winter · Kompletträder Alu · Michelin Alpin 6 · 205/55 R16 91H · 2022" – a set in one line */
export function setSummary(set: TireSet): string {
  const kind = set.kind === 'WHEELS' && set.rims ? `${KINDS.WHEELS} ${RIMS[set.rims]}` : KINDS[set.kind]
  const tyre = [set.brand, set.model].filter(Boolean).join(' ')
  return [SEASONS[set.season], kind, tyre, set.dimension, set.year?.toString()].filter(Boolean).join(' · ')
}

/** "120 Nm · Luftdruck v 2,5 / h 2,7 bar" – what is known to mount the set (FB-11); '' when nothing */
export function mountingSummary(set: TireSet): string {
  return [set.torque != null && `${set.torque} Nm`, pressureSummary(set)].filter(Boolean).join(' · ')
}

/** "Luftdruck v 2,5 / h 2,7 bar" – '' when neither is known */
export function pressureSummary(set: TireSet): string {
  const bar = (value: number | null | undefined) => (value == null ? '?' : String(value).replace('.', ','))
  return set.pressureFront != null || set.pressureRear != null ? `Luftdruck v ${bar(set.pressureFront)} / h ${bar(set.pressureRear)} bar` : ''
}

/** Winter ↔ summer: what comes off when the other season goes on */
const OTHER_SEASON: Record<Season, Season | undefined> = { WINTER: 'SUMMER', SUMMER: 'WINTER', ALL_SEASON: undefined }

export interface SheetTires {
  /** the set to mount from the hotel – booked, else the newest of the vehicle */
  mount?: TireSet
  /** further sets of the vehicle in the hotel – rare, the sheet names their places */
  moreInHotel: TireSet[]
  /** the set probably on the car now: booked, else the one retrieved last (of the other season) */
  takeOff?: TireSet
}

/** @param fromHotel the task mounts wheels/tyres from the hotel (not brought by the customer) */
export function sheetTires(tires: TaskTires, fromHotel: boolean): SheetTires {
  const mount = tires.mounted ?? (fromHotel ? tires.inHotel[0] : undefined)
  const takeOff = tires.removed ?? probablyOnTheCar(tires, mount)
  return { mount, moreInHotel: fromHotel ? tires.inHotel.filter((s) => s.id !== mount?.id) : [], takeOff }
}

/** The set retrieved last – the one put on half a year ago; not one of the season going on */
function probablyOnTheCar(tires: TaskTires, mount: TireSet | undefined): TireSet | undefined {
  return tires.retrieved.find((s) => s.id !== mount?.id && (!mount || mount.season === 'ALL_SEASON' || s.season !== mount.season))
}

/** All sets of the task's car the hotel knows */
export const setsOf = (tires: TaskTires): TireSet[] => [
  ...(tires.mounted ? [tires.mounted] : []),
  ...(tires.removed ? [tires.removed] : []),
  ...tires.inHotel,
  ...tires.retrieved,
]

/** The new set taken off changed – another season brings the car's values of that season (FB-11) */
export function withRemoved(form: BookingForm, removed: TireSetForm, tires: TaskTires): BookingForm {
  const next =
    removed.season === form.removed.season
      ? removed
      : withMountingProposal(removed, mountingProposal(setsOf(tires), form.removed.season), mountingProposal(setsOf(tires), removed.season))
  return { ...form, removed: next }
}

/** Booked = something went out of or into the hotel */
export const isBooked = (tires: TaskTires) => !!tires.mounted || !!tires.removed

/** "Abmontiert": not stored, a new set, or the id of a set retrieved earlier – stored again */
export type RemovedChoice = 'none' | 'new' | string

export interface BookingForm {
  /** the set from the hotel now on the car; null = none from the hotel */
  mountedId: string | null
  /** only its depths are used */
  mounted: TireSetForm
  removedChoice: RemovedChoice
  removed: TireSetForm
}

/** What is most likely: the set of the hotel goes on, the one retrieved last comes off and goes in. */
export function initialBooking(tires: TaskTires, fromHotel: boolean, today: string): BookingForm {
  const { mount, takeOff } = sheetTires(tires, fromHotel)
  const empty = emptyForm(today)
  const otherSeason = mount && OTHER_SEASON[mount.season]
  const removedSeason = otherSeason ?? empty.season
  return {
    mountedId: tires.mounted ? null : (mount?.id ?? null),
    mounted: { ...empty, season: mount?.season ?? empty.season },
    removedChoice: tires.removed ? 'none' : (takeOff?.id ?? 'new'),
    removed: { ...empty, season: removedSeason, ...mountingProposal(setsOf(tires), removedSeason) },
  }
}

export interface BookingErrors {
  mounted: TireSetErrors
  removed: TireSetErrors
}

/** Depths only – except a new set, which needs season and kind too */
export function bookingErrors(form: BookingForm, today: string): BookingErrors {
  const depthErrors = (errors: TireSetErrors) =>
    Object.fromEntries(WHEELS.filter((w) => errors[w.key]).map((w) => [w.key, errors[w.key]])) as TireSetErrors
  const removed = tireSetErrors(form.removed, today)
  return {
    mounted: form.mountedId ? depthErrors(tireSetErrors(form.mounted, today)) : {},
    removed: form.removedChoice === 'none' ? {} : form.removedChoice === 'new' ? removed : depthErrors(removed),
  }
}

export const hasErrors = (errors: BookingErrors) => Object.keys(errors.mounted).length + Object.keys(errors.removed).length > 0

/** Something to book at all */
export const isEmpty = (form: BookingForm) => !form.mountedId && form.removedChoice === 'none'

/** Form → JSON for POST /api/tasks/{id}/tires */
export function toBookingRequest(form: BookingForm, placeId: string | null): TaskTireBookingRequest {
  const r = form.removed
  const text = (value: string) => value.trim() || undefined
  const removed =
    form.removedChoice === 'none'
      ? undefined
      : form.removedChoice === 'new'
        ? {
            season: r.season || undefined,
            kind: r.kind || undefined,
            rims: r.kind === 'WHEELS' && r.rims ? r.rims : undefined,
            hubCaps: r.hubCaps,
            wheelBolts: r.wheelBolts,
            brand: text(r.brand),
            model: text(r.model),
            dimension: text(r.dimension),
            year: r.year.trim() ? Number(r.year.trim()) : undefined,
            remark: text(r.remark),
            ...mountingOf(r),
            depths: depthsOf(r),
            placeId: placeId ?? undefined,
          }
        : { setId: form.removedChoice, depths: depthsOf(r), placeId: placeId ?? undefined }
  return {
    mounted: form.mountedId ? { setId: form.mountedId, depths: depthsOf(form.mounted) } : undefined,
    removed,
  }
}

/** A swap: the set taken off goes where the mounted one lay – else none (the hotel proposes the next free place) */
export function swapPlace(form: BookingForm, tires: TaskTires): string | null {
  return tires.inHotel.find((s) => s.id === form.mountedId)?.placeId ?? null
}
