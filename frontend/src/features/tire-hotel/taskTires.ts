import { KINDS, RIMS, SEASONS, type NewTireSet, type Season, type TaskTireBookingRequest, type TaskTires, type TireSet } from './tireHotelApi'
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
 * The tyre change of a task (13q, FB-12): what the task sheet prints, and booking it once the wheels
 * are changed – from the hotel or not: tyres the customer brings or takes home are recorded too.
 * Pure functions, tested.
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

/**
 * @param fromHotel the task mounts wheels/tyres from the hotel – else the customer brings them: a set
 *                  known to be with them (FB-12)
 */
export function sheetTires(tires: TaskTires, fromHotel: boolean): SheetTires {
  const mount = tires.mounted ?? (fromHotel ? tires.inHotel[0] : tires.outside.find((s) => s.state === 'WITH_CUSTOMER'))
  const takeOff = tires.removed ?? probablyOnTheCar(tires, mount)
  return { mount, moreInHotel: fromHotel ? tires.inHotel.filter((s) => s.id !== mount?.id) : [], takeOff }
}

/** The set on the car (FB-12) – else the one out of the hotel last, not one of the season going on */
function probablyOnTheCar(tires: TaskTires, mount: TireSet | undefined): TireSet | undefined {
  const others = tires.outside.filter((s) => s.id !== mount?.id)
  return (
    others.find((s) => s.state === 'MOUNTED') ??
    others.find((s) => !mount || mount.season === 'ALL_SEASON' || s.season !== mount.season)
  )
}

/** All sets of the task's car the hotel knows */
export const setsOf = (tires: TaskTires): TireSet[] => [
  ...(tires.mounted ? [tires.mounted] : []),
  ...(tires.removed ? [tires.removed] : []),
  ...tires.inHotel,
  ...tires.outside,
]

/** A set's data changed – another season of a new set brings the car's values of that season (FB-11) */
export function withSet(form: BookingForm, which: 'mounted' | 'removed', set: TireSetForm, tires: TaskTires): BookingForm {
  const before = form[which]
  const next =
    set.season === before.season
      ? set
      : withMountingProposal(set, mountingProposal(setsOf(tires), before.season), mountingProposal(setsOf(tires), set.season))
  return { ...form, [which]: next }
}

/** Booked = the change was recorded */
export const isBooked = (tires: TaskTires) => !!tires.mounted || !!tires.removed

/** A set of the vehicle (its id), a new one, or nothing recorded */
export type SetChoice = 'none' | 'new' | string

/** Where the set taken off goes (FB-12) */
export type RemovedTo = 'hotel' | 'customer'

export interface BookingForm {
  /** "Montiert": a set from the hotel or brought by the customer, a new one they brought, or none */
  mountedChoice: SetChoice
  /** its depths – and its data when new */
  mounted: TireSetForm
  /** "Abmontiert": a set of the vehicle not in the hotel (the one on the car), a new one, or none */
  removedChoice: SetChoice
  removedTo: RemovedTo
  removed: TireSetForm
}

/**
 * What is most likely: the set of the hotel – or the one the customer has – goes on, the one on the
 * car comes off and goes into the hotel (from the hotel) or home with the customer (brought).
 */
export function initialBooking(tires: TaskTires, fromHotel: boolean, today: string): BookingForm {
  const { mount, takeOff } = sheetTires(tires, fromHotel)
  const empty = emptyForm(today)
  const otherSeason = mount && OTHER_SEASON[mount.season]
  const removedSeason = otherSeason ?? empty.season
  return {
    mountedChoice: tires.mounted ? 'none' : (mount?.id ?? (fromHotel ? 'none' : 'new')),
    mounted: { ...empty, season: mount?.season ?? empty.season },
    removedChoice: tires.removed ? 'none' : (takeOff?.id ?? 'new'),
    removedTo: fromHotel ? 'hotel' : 'customer',
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
  const errorsOf = (choice: SetChoice, set: TireSetForm) => {
    const errors = tireSetErrors(set, today)
    return choice === 'none' ? {} : choice === 'new' ? errors : depthErrors(errors)
  }
  return { mounted: errorsOf(form.mountedChoice, form.mounted), removed: errorsOf(form.removedChoice, form.removed) }
}

export const hasErrors = (errors: BookingErrors) => Object.keys(errors.mounted).length + Object.keys(errors.removed).length > 0

/** Something to book at all */
export const isEmpty = (form: BookingForm) => form.mountedChoice === 'none' && form.removedChoice === 'none'

/** A new set's data as entered */
function newSetOf(set: TireSetForm): NewTireSet {
  const text = (value: string) => value.trim() || undefined
  return {
    season: set.season || undefined,
    kind: set.kind || undefined,
    rims: set.kind === 'WHEELS' && set.rims ? set.rims : undefined,
    hubCaps: set.hubCaps,
    wheelBolts: set.wheelBolts,
    brand: text(set.brand),
    model: text(set.model),
    dimension: text(set.dimension),
    year: set.year.trim() ? Number(set.year.trim()) : undefined,
    remark: text(set.remark),
    ...mountingOf(set),
  }
}

/**
 * Another set chosen. A set already with the customer cannot be taken home again – it goes into the
 * hotel (FB-12). A known set brings its season along (the data of a new one stays as typed).
 */
export function withChoice(form: BookingForm, which: 'mounted' | 'removed', choice: SetChoice, set?: TireSet): BookingForm {
  if (which === 'mounted') {
    return { ...form, mountedChoice: choice, mounted: set ? { ...form.mounted, season: set.season } : form.mounted }
  }
  return {
    ...form,
    removedChoice: choice,
    removed: set ? { ...form.removed, season: set.season } : form.removed,
    removedTo: set?.state === 'WITH_CUSTOMER' ? 'hotel' : form.removedTo,
  }
}

/** A known set or a new one, with the depths */
function setOf(choice: SetChoice, set: TireSetForm) {
  return choice === 'new' ? { newSet: newSetOf(set), depths: depthsOf(set) } : { setId: choice, depths: depthsOf(set) }
}

/** Form → JSON for POST /api/tasks/{id}/tires */
export function toBookingRequest(form: BookingForm, placeId: string | null): TaskTireBookingRequest {
  const store = form.removedTo === 'hotel'
  return {
    mounted: form.mountedChoice === 'none' ? undefined : setOf(form.mountedChoice, form.mounted),
    removed:
      form.removedChoice === 'none'
        ? undefined
        : { ...setOf(form.removedChoice, form.removed), store, placeId: store ? (placeId ?? undefined) : undefined },
  }
}

/** A swap: the set taken off goes where the mounted one lay – else none (the hotel proposes the next free place) */
export function swapPlace(form: BookingForm, tires: TaskTires): string | null {
  return tires.inHotel.find((s) => s.id === form.mountedChoice)?.placeId ?? null
}
