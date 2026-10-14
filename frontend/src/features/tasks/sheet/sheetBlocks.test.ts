import { describe, expect, it } from 'vitest'
import { sheetBlocks } from './sheetBlocks'

describe('sheetBlocks', () => {
  it('no option with a block ticked = no block', () => {
    expect(sheetBlocks({ tireChange: false, tireChangeKind: null })).toEqual([])
  })

  it('tire change: from the tire hotel or brought, wheels or only tires', () => {
    expect(sheetBlocks({ tireChange: true, tireChangeKind: 'WHEELS_STORED' })).toEqual([{ kind: 'tires', stored: true, wheels: true }])
    expect(sheetBlocks({ tireChange: true, tireChangeKind: 'TIRES_STORED' })).toEqual([{ kind: 'tires', stored: true, wheels: false }])
    expect(sheetBlocks({ tireChange: true, tireChangeKind: 'WHEELS_BROUGHT' })).toEqual([{ kind: 'tires', stored: false, wheels: true }])
    expect(sheetBlocks({ tireChange: true, tireChangeKind: 'TIRES_BROUGHT' })).toEqual([{ kind: 'tires', stored: false, wheels: false }])
  })

  it('tire change without a kind: like brought wheels – the mechanic ticks what applies', () => {
    expect(sheetBlocks({ tireChange: true, tireChangeKind: null })).toEqual([{ kind: 'tires', stored: false, wheels: true }])
  })
})
