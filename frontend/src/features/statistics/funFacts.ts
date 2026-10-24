import { WEEKDAYS } from '../../lib/calendar'
import { formatCount, formatDate, formatDecimal, formatQuantity } from '../../lib/format'
import type { Statistics } from './statisticsApi'

/** Once around the equator */
export const EARTH_KM = 40_075
/** From the earth to the moon, on average */
export const MOON_KM = 384_400
/** An average car with a little room to the next one */
const CAR_LENGTH_M = 4.5
/** A tyre lying flat, for the tower of tyres */
const TIRE_HEIGHT_M = 0.2
/** Eiffel Tower with its antennas */
const EIFFEL_M = 330

export interface FunFact {
  /** Short heading, e.g. "Kilometer" */
  topic: string
  text: string
}

/** "800 m" below a kilometre, "1,2 km" from there */
function formatLength(metres: number): string {
  return metres < 1000 ? `${formatCount(metres)} m` : `${formatDecimal(metres / 1000)} km`
}

/**
 * Sentences that make the numbers tangible – only those the data allows (no "0-mal um die Erde").
 * The order is the order on the page.
 */
export function funFacts(stats: Statistics): FunFact[] {
  const { tasks, vehicles, customers, team, material } = stats
  const facts: FunFact[] = []

  if (vehicles.totalKm >= EARTH_KM) {
    const moon = vehicles.totalKm >= MOON_KM ? ` – oder ${formatDecimal(vehicles.totalKm / MOON_KM)}-mal bis zum Mond` : ''
    facts.push({
      topic: 'Kilometer',
      text: `Alle Fahrzeuge zusammen sind ${formatCount(vehicles.totalKm)} km gefahren: ${formatDecimal(vehicles.totalKm / EARTH_KM)}-mal um die Erde${moon}.`,
    })
  }
  if (vehicles.total >= 10) {
    facts.push({
      topic: 'Stau',
      text: `Stellt man alle ${formatCount(vehicles.total)} Fahrzeuge hintereinander, gibt das eine Kolonne von ${formatLength(vehicles.total * CAR_LENGTH_M)}.`,
    })
  }
  const busiest = Math.max(...tasks.perWeekday)
  if (busiest > 0) {
    facts.push({ topic: 'Lieblingstag', text: `Am meisten los ist am ${WEEKDAYS[tasks.perWeekday.indexOf(busiest)]}.` })
  }
  const hour = [...tasks.perHour].sort((a, b) => b.count - a.count)[0]
  if (hour) {
    const verb = hour.count === 1 ? 'startet' : 'starten'
    facts.push({
      topic: 'Rush Hour',
      text: `Die beliebteste Termin-Zeit ist ${hour.label} Uhr – ${formatQuantity(hour.count, 'Termin', 'Termine')} ${verb} dann.`,
    })
  }
  const firstName = customers.firstNames[0]
  if (firstName && firstName.count > 1) {
    facts.push({
      topic: 'Vorname',
      text: `Der häufigste Vorname unserer Kunden ist «${firstName.label}» – ${formatCount(firstName.count)}-mal.`,
    })
  }
  if (vehicles.oldest?.year != null) {
    const age = Number(stats.today.slice(0, 4)) - vehicles.oldest.year
    facts.push({
      topic: 'Oldtimer',
      text: `Das älteste Fahrzeug ist ein ${vehicleName(vehicles.oldest)} von ${vehicles.oldest.year} – ${formatQuantity(age, 'Jahr', 'Jahre')} alt.`,
    })
  }
  if (vehicles.mostKm?.mileageKm) {
    facts.push({
      topic: 'Kilometer-König',
      text: `Der ${vehicleName(vehicles.mostKm)} hat ${formatCount(vehicles.mostKm.mileageKm)} km auf dem Tacho.`,
    })
  }
  const inHotel = tiresInHotel(stats)
  if (inHotel > 0) {
    const height = inHotel * 4 * TIRE_HEIGHT_M
    const eiffel = height >= EIFFEL_M ? ' – höher als der Eiffelturm' : ''
    facts.push({
      topic: 'Reifenturm',
      text: `Im Pneuhotel liegen ${formatCount(inHotel * 4)} Reifen. Aufeinandergestapelt wäre der Turm ${formatDecimal(height)} m hoch${eiffel}.`,
    })
  }
  if (material.courtesyDays > 0) {
    facts.push({ topic: 'Ersatzwagen', text: `Die Ersatzwagen waren zusammen ${formatQuantity(material.courtesyDays, 'Tag', 'Tage')} unterwegs.` })
  }
  if (team.todosDone > 0) {
    const champion = team.todoChampion ? ` Am fleissigsten abgehakt hat ${team.todoChampion.label}.` : ''
    facts.push({ topic: 'Abgehakt', text: `${formatQuantity(team.todosDone, 'To-do ist', 'To-dos sind')} erledigt.${champion}` })
  }
  if (tasks.busiestDay) {
    facts.push({
      topic: 'Rekordtag',
      text: `Am meisten Termine an einem Tag: ${formatCount(tasks.busiestDay.count)} am ${formatDate(tasks.busiestDay.label)}.`,
    })
  }
  return facts
}

/** Sets in the hotel right now */
export function tiresInHotel(stats: Statistics): number {
  return stats.tires.states.find((state) => state.label === 'IN_HOTEL')?.count ?? 0
}

/** "VW Golf", or what is known of it */
export function vehicleName(vehicle: { make?: string | null; model?: string | null }): string {
  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Fahrzeug'
}
