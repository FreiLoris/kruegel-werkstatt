import { describe, expect, it } from 'vitest'
import type { ShoppingItem } from './shoppingApi'
import { byTask, openSummary, quantityText, taskLabel } from './shoppingText'

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

  it('counts what is to order and what is ordered', () => {
    expect(openSummary([item('a'), item('b'), item('c', { status: 'ORDERED' })])).toBe('2 zu bestellen · 1 bestellt')
    expect(openSummary([])).toBe('')
  })

  it('filters with and without a task (FB-20)', () => {
    const items = [item('a', { task }), item('b')]
    expect(byTask(items, 'all').map((i) => i.id)).toEqual(['a', 'b'])
    expect(byTask(items, 'task').map((i) => i.id)).toEqual(['a'])
    expect(byTask(items, 'workshop').map((i) => i.id)).toEqual(['b'])
  })
})
