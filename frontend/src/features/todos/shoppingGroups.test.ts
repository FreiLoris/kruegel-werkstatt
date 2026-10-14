import { describe, expect, it } from 'vitest'
import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import { orderText, shoppingGroups } from './shoppingGroups'
import type { Todo } from './todoApi'

// fictitious
const supplier = (id: string, name: string, customerNumber: string | null = null) => ({ id, name, customerNumber }) as Supplier
const entry = (id: string, text: string, supplierId: string | null, stockItemId: string | null = null) =>
  ({ id, text, supplierId, stockItemId }) as Todo
const muster = supplier('m', 'Muster Teile AG', 'K-42')
const beispiel = supplier('b', 'Beispiel Handel')
const items = [
  { id: 'oil', name: 'Ölfilter', articleNumber: 'OF-1', suppliers: [{ supplierId: 'm', articleNumber: 'MT-77' }] },
  { id: 'brake', name: 'Bremsreiniger', articleNumber: 'BR-9', suppliers: [] },
] as unknown as StockItem[]

describe('shoppingGroups', () => {
  it('by supplier name, without supplier last – a deleted one counts as none', () => {
    const groups = shoppingGroups(
      [entry('1', 'Kaffee', null), entry('2', 'Ölfilter', 'm'), entry('3', 'Schrauben', 'b'), entry('4', 'Kabel', 'gone')],
      [muster, beispiel],
    )

    expect(groups.map((g) => [g.supplier?.name ?? 'ohne', g.entries.map((e) => e.text)])).toEqual([
      ['Beispiel Handel', ['Schrauben']],
      ['Muster Teile AG', ['Ölfilter']],
      ['ohne', ['Kaffee', 'Kabel']],
    ])
  })
})

describe('orderText', () => {
  it('one line per entry with the supplier number (else the own one), our customer number on top', () => {
    const [group] = shoppingGroups([entry('1', '2× Ölfilter', 'm', 'oil'), entry('2', 'Bremsreiniger', 'm', 'brake'), entry('3', 'Lappen', 'm')], [muster])

    expect(orderText(group, items)).toBe(
      ['Kundennummer: K-42', '', '- 2× Ölfilter (Art.-Nr. MT-77)', '- Bremsreiniger (Art.-Nr. BR-9)', '- Lappen'].join('\n'),
    )
  })
})
