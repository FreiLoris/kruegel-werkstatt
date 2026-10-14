import { describe, expect, it } from 'vitest'
import type { Task } from '../taskApi'
import { sheetBlocks } from './sheetBlocks'

const task = (more: Partial<Pick<Task, 'tireChange' | 'tireChangeKind' | 'insuranceId'>> = {}) => ({
  tireChange: false,
  tireChangeKind: null,
  insuranceId: null,
  ...more,
})

describe('sheetBlocks', () => {
  it('no option with a block ticked = no block', () => {
    expect(sheetBlocks(task())).toEqual([])
  })

  it('tire change: from the tire hotel or brought, wheels or only tires', () => {
    expect(sheetBlocks(task({ tireChange: true, tireChangeKind: 'WHEELS_STORED' }))).toEqual([{ kind: 'tires', stored: true, wheels: true }])
    expect(sheetBlocks(task({ tireChange: true, tireChangeKind: 'TIRES_STORED' }))).toEqual([{ kind: 'tires', stored: true, wheels: false }])
    expect(sheetBlocks(task({ tireChange: true, tireChangeKind: 'WHEELS_BROUGHT' }))).toEqual([{ kind: 'tires', stored: false, wheels: true }])
    expect(sheetBlocks(task({ tireChange: true, tireChangeKind: 'TIRES_BROUGHT' }))).toEqual([{ kind: 'tires', stored: false, wheels: false }])
  })

  it('tire change without a kind: like brought wheels – the mechanic ticks what applies', () => {
    expect(sheetBlocks(task({ tireChange: true }))).toEqual([{ kind: 'tires', stored: false, wheels: true }])
  })

  it('insurance case: its own block – combined with others', () => {
    expect(sheetBlocks(task({ tireChange: true, tireChangeKind: 'WHEELS_STORED', insuranceId: 'i1' }))).toEqual([
      { kind: 'tires', stored: true, wheels: true },
      { kind: 'insurance' },
    ])
  })
})
