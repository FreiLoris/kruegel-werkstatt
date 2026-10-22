import { describe, expect, it } from 'vitest'
import type { ShoppingItem } from '../shopping/shoppingApi'
import type { Task } from './taskApi'
import { workItems, workSummary } from './workSummary'

function task(overrides: Partial<Task>): Task {
  return {
    tireChange: false,
    mfk: false,
    serviceItemIds: [],
    parts: null,
    workDescription: null,
    ...overrides,
  } as Task
}

describe('workSummary', () => {
  const names = new Map([
    ['oil', 'Ölwechsel'],
    ['wipers', 'Wischblätter'],
  ])

  it('lists ticked work first, then the free text', () => {
    const summary = workSummary(
      task({
        tireChange: true,
        mfk: true,
        serviceItemIds: ['oil', 'wipers'],
        workDescription: 'Geräusch hinten links',
      }),
      names,
    )

    expect(summary).toBe('Radwechsel · MFK · Ölwechsel · Wischblätter · Geräusch hinten links')
  })

  it('is empty when nothing is entered', () => {
    expect(workSummary(task({}), names)).toBe('')
  })
})

describe('workItems', () => {
  it('adds the details for the task sheet', () => {
    const items = workItems(
      task({
        tireChange: true,
        tireChangeKind: 'WHEELS_STORED',
        mfk: true,
        mfkAppointment: '2026-10-15T10:00:00',
      }),
      new Map(),
      // its parts on the shopping list (FB-19), fictitious
      [{ description: 'Bremsscheiben', quantity: 2, status: 'ORDERED', partNumber: 'BS-1' } as ShoppingItem],
    )

    expect(items).toEqual([
      { label: 'Radwechsel', detail: 'Räder eingelagert' },
      { label: 'MFK', detail: 'Termin 15.10.2026, 10:00' },
      { label: 'Material: 2× Bremsscheiben', detail: 'bestellt · Nr. BS-1' },
    ])
  })
})
