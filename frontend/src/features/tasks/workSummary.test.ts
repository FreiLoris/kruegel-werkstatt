import { describe, expect, it } from 'vitest'
import type { Task } from './taskApi'
import { workSummary } from './workSummary'

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
        parts: { description: 'Bremsscheiben', status: 'ORDERED', supplier: null, orderedOn: null },
        workDescription: 'Geräusch hinten links',
      }),
      names,
    )

    expect(summary).toBe('Radwechsel · MFK · Ölwechsel · Wischblätter · Material: Bremsscheiben · Geräusch hinten links')
  })

  it('is empty when nothing is entered', () => {
    expect(workSummary(task({}), names)).toBe('')
  })
})
