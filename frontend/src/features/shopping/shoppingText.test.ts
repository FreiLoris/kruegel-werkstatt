import { describe, expect, it } from 'vitest'
import { turnOf, type ShoppingItem } from './shoppingApi'
import { ALL_DELIVERIES, byDelivery, byTurn, deliveriesOf, NO_DELIVERY, byTask, openSummary, quantityText, taskLabel } from './shoppingText'

// fictitious
const task = { id: 't1', date: null, time: null, timeOpen: false, customerName: 'Muster AG', taskNumber: '26-0007', licensePlate: 'ZH 123456' }
const item = (id: string, more: Partial<ShoppingItem> = {}) => ({ id, description: 'Ölfilter', quantity: 1, status: 'TO_ORDER', task: null, ...more }) as ShoppingItem

describe('shoppingText', () => {
  it('names the task by number, customer and plate (FB-19)', () => {
    expect(taskLabel(task)).toBe('26-0007 · Muster AG · ZH 123456')
    expect(taskLabel({ ...task, taskNumber: null, licensePlate: null })).toBe('Muster AG')
  })

  it('the quantity only when more than one', () => {
    expect(quantityText(item('a'))).toBe('Ölfilter')
    expect(quantityText(item('a', { quantity: 2 }))).toBe('2× Ölfilter')
  })

  it('counts who is up: we or the supplier (FB-28)', () => {
    const items = [item('a'), item('b', { status: 'INFO_NEEDED' }), item('c', { status: 'QUOTE_REQUESTED' }), item('d', { status: 'ORDERED' })]
    expect(openSummary(items)).toBe('2 – wir sind dran · 2 – wartet auf Lieferant')
    expect(openSummary([])).toBe('')
  })

  it('nobody is up any more when it arrived or was cancelled', () => {
    expect(turnOf('QUOTE_RECEIVED')).toBe('us')
    expect(turnOf('QUOTE_REQUESTED')).toBe('supplier')
    expect(turnOf('ARRIVED')).toBeNull()
    expect(turnOf('CANCELLED')).toBeNull()
  })

  it('filters with and without a task (FB-20)', () => {
    const items = [item('a', { task }), item('b')]
    expect(byTask(items, 'all').map((i) => i.id)).toEqual(['a', 'b'])
    expect(byTask(items, 'task').map((i) => i.id)).toEqual(['a'])
    expect(byTask(items, 'workshop').map((i) => i.id)).toEqual(['b'])
  })
})

describe('ways of delivery (FB-30)', () => {
  const via = (delivery: string | null) => ({ delivery })
  const items = [via('Tagesexpress'), via(null), via('Nachtexpress'), via('Tagesexpress')]

  it('the ones in use, sorted, each once', () => {
    expect(deliveriesOf(items)).toEqual(['Nachtexpress', 'Tagesexpress'])
  })

  it('filters by one – or those without, or all', () => {
    expect(byDelivery(items, 'Tagesexpress')).toHaveLength(2)
    expect(byDelivery(items, NO_DELIVERY)).toEqual([via(null)])
    expect(byDelivery(items, ALL_DELIVERIES)).toBe(items)
  })
})

describe('byTurn (FB-28)', () => {
  const items = [{ status: 'TO_ORDER' as const }, { status: 'ORDERED' as const }, { status: 'QUOTE_REQUESTED' as const }]

  it('we are up, or the supplier – or all', () => {
    expect(byTurn(items, 'us')).toEqual([{ status: 'TO_ORDER' }])
    expect(byTurn(items, 'supplier')).toEqual([{ status: 'ORDERED' }, { status: 'QUOTE_REQUESTED' }])
    expect(byTurn(items, 'all')).toBe(items)
  })
})
