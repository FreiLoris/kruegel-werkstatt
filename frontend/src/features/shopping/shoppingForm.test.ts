import { describe, expect, it } from 'vitest'
import type { ShoppingItem } from './shoppingApi'
import { detailFormFromItem, emptyShoppingForm, formFromItem, shoppingErrors, toShoppingDetailRequest, toShoppingRequest, withSupplier, type ShoppingDetailForm } from './shoppingForm'

// fictitious
const item = {
  id: 'i1',
  version: 3,
  description: 'Bremsscheiben vorne',
  partNumber: '0986479S27',
  quantity: 2,
  status: 'ORDERED',
  recordedById: null,
  orderById: 'erich',
  task: { id: 't1', date: null, time: null, timeOpen: false, customerName: 'Muster AG', taskNumber: '26-0007', licensePlate: 'ZH 1' },
  stockItemId: null,
  supplierId: 's1',
  orderedOn: '2026-10-20',
  expectedOn: '2026-10-23',
  arrivedOn: null,
} as unknown as ShoppingItem

describe('quick entry', () => {
  it('starts empty, recorded by the person of the device', () => {
    expect(emptyShoppingForm('reto')).toEqual({
      description: '',
      partNumber: '',
      quantity: '1',
      status: 'TO_ORDER',
      recordedById: 'reto',
      orderById: '',
    })
  })

  it('needs what, how many and who records it', () => {
    expect(shoppingErrors({ ...emptyShoppingForm(undefined), quantity: '0' })).toEqual({
      description: 'Was wird gebraucht?',
      quantity: 'Anzahl, z. B. 2',
      recordedById: 'Wer erfasst es?',
    })
    expect(shoppingErrors({ ...emptyShoppingForm('reto'), description: 'Ölfilter' })).toEqual({})
  })

  it('a new one for the task it is entered on', () => {
    const form = { ...emptyShoppingForm('reto'), description: ' Ölfilter ', partNumber: ' ', quantity: '2', orderById: 'erich' }
    expect(toShoppingRequest(form, 't1')).toMatchObject({
      description: 'Ölfilter',
      partNumber: undefined,
      quantity: 2,
      recordedById: 'reto',
      orderById: 'erich',
      taskId: 't1',
      version: undefined,
    })
  })

  it('editing in place keeps what is only on the position page', () => {
    const form = formFromItem(item, 'reto')
    // the old list had nobody – the person of the device
    expect(form).toMatchObject({ quantity: '2', recordedById: 'reto', orderById: 'erich' })
    expect(toShoppingRequest({ ...form, quantity: '3' }, undefined, item)).toMatchObject({
      quantity: 3,
      taskId: 't1',
      supplierId: 's1',
      orderedOn: '2026-10-20',
      expectedOn: '2026-10-23',
      version: 3,
    })
  })
})

describe('position page', () => {
  it('supplier and days changed there; empty ones are sent empty', () => {
    const form = detailFormFromItem(item, 'reto')
    expect(form).toMatchObject({ supplierId: 's1', orderedOn: '2026-10-20', expectedOn: '2026-10-23', stockItemId: '' })
    expect(toShoppingDetailRequest({ ...form, supplierId: '', expectedOn: '2026-10-24' }, item)).toMatchObject({
      supplierId: undefined,
      expectedOn: '2026-10-24',
      orderedOn: '2026-10-20',
      taskId: 't1',
      version: 3,
    })
  })
})

describe('withSupplier (FB-30)', () => {
  const kinds = (id: string) => (id === 'a' ? ['Tagesexpress', 'Abholung'] : id === 'b' ? ['Tagesexpress'] : [])
  const form = { supplierId: 'a', delivery: 'Abholung' } as ShoppingDetailForm

  it('keeps the way of delivery only if the new supplier has it too', () => {
    expect(withSupplier(form, 'b', kinds)).toMatchObject({ supplierId: 'b', delivery: '' })
    expect(withSupplier({ ...form, delivery: 'Tagesexpress' }, 'b', kinds).delivery).toBe('Tagesexpress')
    expect(withSupplier(form, '', kinds).delivery).toBe('')
  })
})
