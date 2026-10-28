import type { ShoppingItem, ShoppingItemRequest, ShoppingStatus } from './shoppingApi'

/**
 * The six fields of the quick entry (FB-19, FB-20 – the same on the list and on the task) as form
 * state: text while typing, '' = empty. Pure functions, tested.
 */
export interface ShoppingForm {
  description: string
  partNumber: string
  /** "1", "2" … */
  quantity: string
  status: ShoppingStatus
  /** "Erfasst von" – the person of the device, changeable */
  recordedById: string
  /** "Bestellen durch"; '' = not assigned */
  orderById: string
  /** editing: the version from when the form was opened – never the live one (a change meanwhile = 409) */
  version?: number
}

export type ShoppingErrors = Partial<Record<'description' | 'quantity' | 'recordedById', string>>

const QUANTITY_MAX = 9999

/** An empty line – recorded by the person of the device */
export function emptyShoppingForm(recordedById: string | undefined): ShoppingForm {
  return { description: '', partNumber: '', quantity: '1', status: 'TO_ORDER', recordedById: recordedById ?? '', orderById: '' }
}

/** A position back into the line – to edit it in place */
export function formFromItem(item: ShoppingItem, fallbackRecordedBy: string | undefined): ShoppingForm {
  return {
    description: item.description,
    partNumber: item.partNumber ?? '',
    quantity: String(item.quantity),
    status: item.status,
    // positions of the old list have nobody – then the person of the device
    recordedById: item.recordedById ?? fallbackRecordedBy ?? '',
    orderById: item.orderById ?? '',
    version: item.version,
  }
}

export function shoppingErrors(form: ShoppingForm): ShoppingErrors {
  const errors: ShoppingErrors = {}
  if (!form.description.trim()) errors.description = 'Was wird gebraucht?'
  const quantity = form.quantity.trim()
  if (!/^\d{1,4}$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > QUANTITY_MAX) errors.quantity = 'Anzahl, z. B. 2'
  if (!form.recordedById) errors.recordedById = 'Wer erfasst es?'
  return errors
}

/**
 * Form → JSON. Editing keeps what is only on the position's page (supplier, dates …): `item` is the
 * position as loaded – its version too.
 */
export function toShoppingRequest(form: ShoppingForm, taskId: string | undefined, item?: ShoppingItem): ShoppingItemRequest {
  return {
    description: form.description.trim(),
    partNumber: form.partNumber.trim() || undefined,
    quantity: Number(form.quantity.trim()),
    status: form.status,
    recordedById: form.recordedById,
    orderById: form.orderById || undefined,
    taskId: item ? (item.task?.id ?? undefined) : taskId,
    stockItemId: item?.stockItemId ?? undefined,
    supplierId: item?.supplierId ?? undefined,
    orderedOn: item?.orderedOn ?? undefined,
    expectedOn: item?.expectedOn ?? undefined,
    delivery: item?.delivery ?? undefined,
    version: form.version,
  }
}

/** The position's page: the six fields and what is added later – article, supplier, days (FB-20) */
export interface ShoppingDetailForm extends ShoppingForm {
  stockItemId: string
  supplierId: string
  /** yyyy-mm-dd; '' = empty */
  orderedOn: string
  expectedOn: string
  /** how it is ordered – one of the supplier's ways of delivery (FB-30); '' = not said */
  delivery: string
}

export function detailFormFromItem(item: ShoppingItem, fallbackRecordedBy: string | undefined): ShoppingDetailForm {
  return {
    ...formFromItem(item, fallbackRecordedBy),
    stockItemId: item.stockItemId ?? '',
    supplierId: item.supplierId ?? '',
    orderedOn: item.orderedOn ?? '',
    expectedOn: item.expectedOn ?? '',
    delivery: item.delivery ?? '',
  }
}

/** Form → JSON for PUT; the task stays the one of the position */
export function toShoppingDetailRequest(form: ShoppingDetailForm, item: ShoppingItem): ShoppingItemRequest {
  return {
    ...toShoppingRequest(form, undefined, item),
    stockItemId: form.stockItemId || undefined,
    supplierId: form.supplierId || undefined,
    orderedOn: form.orderedOn || undefined,
    expectedOn: form.expectedOn || undefined,
    delivery: form.delivery || undefined,
  }
}

/**
 * Another supplier chosen: its way of delivery stays only if the new one has it too – "Tagesexpress"
 * of one supplier is not the other's.
 */
export function withSupplier(form: ShoppingDetailForm, supplierId: string, deliveryKinds: (id: string) => string[]): ShoppingDetailForm {
  return { ...form, supplierId, delivery: deliveryKinds(supplierId).includes(form.delivery) ? form.delivery : '' }
}
