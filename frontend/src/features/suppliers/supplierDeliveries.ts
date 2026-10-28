import { isWeekend, weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatTime } from '../../lib/format'
import type { components } from '../../api/schema'

export type SupplierDelivery = components['schemas']['SupplierDeliveryDto']
export type SupplierContact = components['schemas']['SupplierContactDto']

/** Suggestions for the kind of delivery (FB-30) – any other text is fine too */
export const DELIVERY_KINDS = ['Tagesexpress', 'Nachtexpress', 'Standardversand', 'Abholung', 'Kurier']

/** "Fr. 12.50" – Swiss francs with two decimals */
const chf = (amount: number) => `CHF ${amount.toFixed(2)}`

/** "Tagesexpress · Bestellschluss 09:30 · Tour 1 · Ankunft ca. 11:00 · CHF 0.00 · ab CHF 100 gratis" */
export function deliveryText(d: SupplierDelivery): string {
  return [
    d.kind,
    d.orderDeadline && `Bestellschluss ${formatTime(d.orderDeadline)}`,
    d.tour,
    d.arrival && `Ankunft ca. ${formatTime(d.arrival)}${d.arrivalNextDay ? ' (nächster Tag)' : ''}`,
    d.postage != null && chf(d.postage),
    d.remark,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The next working day from `day` on (Monday to Friday – public holidays are not known here) */
function workingDayFrom(day: string): string {
  let d = day
  while (isWeekend(d)) d = addDays(d, 1)
  return d
}

/**
 * Which delivery can still be reached (FB-30): "Nächster Bestellschluss 11:30 (Tour 3, Ankunft ca.
 * 14:00)" – today if there is one left, else the first one of the next working day ("morgen 09:30",
 * "Mo 09:30"). Null when no delivery has an order deadline.
 */
export function nextDeadline(deliveries: SupplierDelivery[], today: string, time: string): string | null {
  const withDeadline = deliveries
    .filter((d): d is SupplierDelivery & { orderDeadline: string } => !!d.orderDeadline)
    .sort((a, b) => a.orderDeadline.localeCompare(b.orderDeadline))
  if (withDeadline.length === 0) return null
  const workToday = !isWeekend(today)
  const later = workToday ? withDeadline.find((d) => formatTime(d.orderDeadline) > time) : undefined
  const next = later ?? withDeadline[0]
  const day = later ? '' : nextDayLabel(today)
  const details = [next.tour, next.arrival && `Ankunft ca. ${formatTime(next.arrival)}${next.arrivalNextDay ? ' am nächsten Tag' : ''}`].filter(Boolean)
  return `Nächster Bestellschluss ${day}${formatTime(next.orderDeadline)} – ${next.kind}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
}

/** "morgen " or "Mo " – the next working day after today */
function nextDayLabel(today: string): string {
  const next = workingDayFrom(addDays(today, 1))
  return next === addDays(today, 1) ? 'morgen ' : `${WEEKDAYS_SHORT[weekdayOf(next)]} `
}
