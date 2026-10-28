import { describe, expect, it } from 'vitest'
import type { Task } from '../taskApi'
import { sheetBlocks } from './sheetBlocks'

const task = (more: Partial<Pick<Task, 'tireChange' | 'tireChangeKind' | 'mfk' | 'insuranceId'>> = {}) => ({
  tireChange: false,
  tireChangeKind: null,
  mfk: false,
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

  it('new tires (FB-25): only tires, with what was ordered', () => {
    expect(sheetBlocks({ ...task({ tireChange: true, tireChangeKind: 'NEW_TIRES' }), newTiresCount: 2, newTiresDimension: '205/55 R16 91H' })).toEqual([
      { kind: 'tires', stored: false, wheels: false, newTires: { count: 2, dimension: '205/55 R16 91H' } },
    ])
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

  it('MFK (FB-10): its block between the tires and the insurance', () => {
    expect(sheetBlocks(task({ mfk: true }))).toEqual([{ kind: 'mfk' }])
    expect(sheetBlocks(task({ tireChange: true, mfk: true, insuranceId: 'i1' })).map((b) => b.kind)).toEqual(['tires', 'mfk', 'insurance'])
  })
})
