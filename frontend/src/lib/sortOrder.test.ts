import { describe, expect, it } from 'vitest'
import { moved } from './sortOrder'

describe('moved', () => {
  it('swaps with the neighbour', () => {
    expect(moved(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('stays put at the edge', () => {
    expect(moved(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })

  it('does not change the original list', () => {
    const list = ['a', 'b']
    moved(list, 0, 1)
    expect(list).toEqual(['a', 'b'])
  })
})
