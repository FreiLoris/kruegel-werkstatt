import { describe, expect, it } from 'vitest'
import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import type { AnyTask } from '../tasks/taskApi'
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

describe('task material in the supplier order (UX G-18)', () => {
  const task = (id: string, description: string, supplierName: string, taskNumber: string | null) =>
    ({ id, taskNumber, customer: { displayName: 'Huber Peter' }, parts: { description, supplier: supplierName } }) as AnyTask

  it('goes into the group of the supplier with that name – also when only material is there – and into the copied order', () => {
    const parts = [task('t1', 'Klimakompressor', 'muster teile ag', '26-0011'), task('t2', 'Auspuff', 'Beispiel Handel', null), task('t3', 'Spiegel', 'Sonstwer', null)]
    const groups = shoppingGroups([entry('1', 'Lappen', 'm')], [muster, beispiel], parts)

    expect(groups.map((g) => [g.supplier?.name, g.parts.map((t) => t.id)])).toEqual([
      ['Beispiel Handel', ['t2']],
      ['Muster Teile AG', ['t1']],
    ])
    expect(orderText(groups[1], items)).toBe(['Kundennummer: K-42', '', '- Lappen', '- Klimakompressor (für Auftrag 26-0011)'].join('\n'))
    expect(orderText(groups[0], items)).toBe('- Auspuff (für Huber Peter)')
  })
})
