import { describe, expect, it } from 'vitest'
import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import type { ShoppingItem } from './shoppingApi'
import { orderText, shoppingGroups } from './shoppingGroups'

// fictitious
const supplier = (id: string, name: string, customerNumber: string | null = null) => ({ id, name, customerNumber }) as Supplier
const item = (id: string, description: string, supplierId: string | null, more: Partial<ShoppingItem> = {}) =>
  ({ id, description, supplierId, quantity: 1, partNumber: null, stockItemId: null, task: null, ...more }) as ShoppingItem
const muster = supplier('m', 'Muster Teile AG', 'K-42')
const beispiel = supplier('b', 'Beispiel Handel')
const stock = [
  { id: 'oil', name: 'Ölfilter', articleNumber: 'OF-1', suppliers: [{ supplierId: 'm', articleNumber: 'MT-77' }] },
  { id: 'brake', name: 'Bremsreiniger', articleNumber: 'BR-9', suppliers: [] },
] as unknown as StockItem[]

describe('shoppingGroups', () => {
  it('by supplier name, without supplier last – a deleted one counts as none', () => {
    const groups = shoppingGroups(
      [item('1', 'Kaffee', null), item('2', 'Ölfilter', 'm'), item('3', 'Schrauben', 'b'), item('4', 'Kabel', 'gone')],
      [muster, beispiel],
    )

    expect(groups.map((g) => [g.supplier?.name ?? 'ohne', g.items.map((i) => i.description)])).toEqual([
      ['Beispiel Handel', ['Schrauben']],
      ['Muster Teile AG', ['Ölfilter']],
      ['ohne', ['Kaffee', 'Kabel']],
    ])
  })
})

describe('orderText', () => {
  it('one line per position: quantity, the number to order with, the task; our customer number on top', () => {
    const task = { id: 't', date: null, time: null, timeOpen: false, customerName: 'Huber Peter', taskNumber: '26-0011', licensePlate: null }
    const [group] = shoppingGroups(
      [
        item('1', 'Ölfilter', 'm', { quantity: 2, stockItemId: 'oil' }),
        item('2', 'Bremsreiniger', 'm', { stockItemId: 'brake' }),
        item('3', 'Klimakompressor', 'm', { partNumber: 'KK-5', task }),
        item('4', 'Lappen', 'm'),
      ],
      [muster],
    )

    expect(orderText(group, stock)).toBe(
      [
        'Kundennummer: K-42',
        '',
        '- 2× Ölfilter (Art.-Nr. MT-77)',
        '- Bremsreiniger (Art.-Nr. BR-9)',
        '- Klimakompressor (Art.-Nr. KK-5, für Auftrag 26-0011)',
        '- Lappen',
      ].join('\n'),
    )
  })
})
