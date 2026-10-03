import { describe, expect, it } from 'vitest'
import { verschoben } from './reihenfolge'

describe('verschoben', () => {
  it('tauscht mit dem Nachbarn', () => {
    expect(verschoben(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(verschoben(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('bleibt am Rand stehen', () => {
    expect(verschoben(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })

  it('verändert die ursprüngliche Liste nicht', () => {
    const liste = ['a', 'b']
    verschoben(liste, 0, 1)
    expect(liste).toEqual(['a', 'b'])
  })
})
