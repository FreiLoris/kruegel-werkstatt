import { formatTime } from '../../lib/format'
import type { SupplierContact, SupplierDelivery } from './supplierApi'

/** A contact as typed – empty text = not set; `rowId` only keeps the row's identity in the form */
export interface ContactForm {
  rowId: string
  department: string
  name: string
  phone: string
  mobile: string
  email: string
  remark: string
}

/** A way of delivery as typed – times "09:30", postage "12.50"; `rowId` as above */
export interface DeliveryForm {
  rowId: string
  kind: string
  orderDeadline: string
  tour: string
  arrival: string
  arrivalNextDay: boolean
  postage: string
  remark: string
}

/** What is wrong with a row before it is sent – shown at the field */
export interface DeliveryProblems {
  kind?: string
  postage?: string
}

const rowId = () => crypto.randomUUID()

export const emptyContact = (): ContactForm => ({ rowId: rowId(), department: '', name: '', phone: '', mobile: '', email: '', remark: '' })
export const emptyDelivery = (): DeliveryForm => ({
  rowId: rowId(),
  kind: '',
  orderDeadline: '',
  tour: '',
  arrival: '',
  arrivalNextDay: false,
  postage: '',
  remark: '',
})

export const contactForm = (c: SupplierContact): ContactForm => ({
  rowId: rowId(),
  department: c.department ?? '',
  name: c.name ?? '',
  phone: c.phone ?? '',
  mobile: c.mobile ?? '',
  email: c.email ?? '',
  remark: c.remark ?? '',
})

export const deliveryForm = (d: SupplierDelivery): DeliveryForm => ({
  rowId: rowId(),
  kind: d.kind,
  orderDeadline: d.orderDeadline ? formatTime(d.orderDeadline) : '',
  tour: d.tour ?? '',
  arrival: d.arrival ? formatTime(d.arrival) : '',
  arrivalNextDay: d.arrivalNextDay,
  postage: d.postage != null ? d.postage.toFixed(2) : '',
  remark: d.remark ?? '',
})

const text = (value: string) => value.trim() || null

/**
 * Rows left completely empty go – an extra "+" by mistake is no error. Done before checking and
 * sending, so the server's row numbers are the rows the form shows.
 */
export const filledContacts = (forms: ContactForm[]) =>
  forms.filter((c) => [c.department, c.name, c.phone, c.mobile, c.email, c.remark].some((v) => v.trim()))

export const filledDeliveries = (forms: DeliveryForm[]) =>
  forms.filter((d) => d.kind.trim() || d.orderDeadline || d.tour.trim() || d.arrival || d.postage.trim() || d.remark.trim())

/**
 * "12.50", "12,50", "1'000", "CHF 5" → the amount; '' → null; anything else → undefined (not
 * readable – said at the field instead of being lost).
 */
export function parsePostage(typed: string): number | null | undefined {
  const plain = typed.replace(/chf|fr\.|['’\s]/gi, '').replace(',', '.')
  if (!plain) return null
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return undefined
  return Number(plain)
}

/** Per row: what has to be fixed before sending; no entry = nothing */
export function deliveryProblems(forms: DeliveryForm[]): Map<number, DeliveryProblems> {
  const problems = new Map<number, DeliveryProblems>()
  forms.forEach((d, i) => {
    const row: DeliveryProblems = {}
    if (!d.kind.trim()) row.kind = 'Art angeben, z. B. Tagesexpress'
    if (parsePostage(d.postage) === undefined) row.postage = 'Betrag, z. B. 12.50'
    if (row.kind || row.postage) problems.set(i, row)
  })
  return problems
}

export function toContacts(forms: ContactForm[]): SupplierContact[] {
  return forms.map((c) => ({
    department: text(c.department),
    name: text(c.name),
    phone: text(c.phone),
    mobile: text(c.mobile),
    email: text(c.email),
    remark: text(c.remark),
  }))
}

/** Only for rows without problems ({@link deliveryProblems}) */
export function toDeliveries(forms: DeliveryForm[]): SupplierDelivery[] {
  return forms.map((d) => ({
    kind: d.kind.trim(),
    orderDeadline: d.orderDeadline || null,
    tour: text(d.tour),
    arrival: d.arrival || null,
    arrivalNextDay: d.arrivalNextDay,
    postage: parsePostage(d.postage) ?? null,
    remark: text(d.remark),
  }))
}
