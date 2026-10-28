import { formatTime } from '../../lib/format'
import type { SupplierContact, SupplierDelivery } from './supplierDeliveries'

/** A contact as typed – empty text = not set */
export interface ContactForm {
  department: string
  name: string
  phone: string
  mobile: string
  email: string
  remark: string
}

/** A way of delivery as typed – times "09:30", postage "12.50" */
export interface DeliveryForm {
  kind: string
  orderDeadline: string
  tour: string
  arrival: string
  arrivalNextDay: boolean
  postage: string
  remark: string
}

export const EMPTY_CONTACT: ContactForm = { department: '', name: '', phone: '', mobile: '', email: '', remark: '' }
export const EMPTY_DELIVERY: DeliveryForm = { kind: '', orderDeadline: '', tour: '', arrival: '', arrivalNextDay: false, postage: '', remark: '' }

export const contactForm = (c: SupplierContact): ContactForm => ({
  department: c.department ?? '',
  name: c.name ?? '',
  phone: c.phone ?? '',
  mobile: c.mobile ?? '',
  email: c.email ?? '',
  remark: c.remark ?? '',
})

export const deliveryForm = (d: SupplierDelivery): DeliveryForm => ({
  kind: d.kind,
  orderDeadline: d.orderDeadline ? formatTime(d.orderDeadline) : '',
  tour: d.tour ?? '',
  arrival: d.arrival ? formatTime(d.arrival) : '',
  arrivalNextDay: d.arrivalNextDay,
  postage: d.postage != null ? d.postage.toFixed(2) : '',
  remark: d.remark ?? '',
})

const text = (value: string) => value.trim() || null

/** Rows left completely empty are not sent – an extra "+" by mistake is no error */
export function toContacts(forms: ContactForm[]): SupplierContact[] {
  return forms
    .filter((c) => Object.values(c).some((v) => v.trim()))
    .map((c) => ({ department: text(c.department), name: text(c.name), phone: text(c.phone), mobile: text(c.mobile), email: text(c.email), remark: text(c.remark) }))
}

export function toDeliveries(forms: DeliveryForm[]): SupplierDelivery[] {
  return forms
    .filter((d) => d.kind.trim() || d.orderDeadline || d.tour.trim() || d.arrival || d.postage.trim() || d.remark.trim())
    .map((d) => ({
      kind: d.kind.trim(),
      orderDeadline: d.orderDeadline || null,
      tour: text(d.tour),
      arrival: d.arrival || null,
      arrivalNextDay: d.arrivalNextDay,
      // "12,50" as typed in Switzerland too
      postage: d.postage.trim() ? Number(d.postage.trim().replace(',', '.')) : null,
      remark: text(d.remark),
    }))
}
