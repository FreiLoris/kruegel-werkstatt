import { describe, expect, it } from 'vitest'
import { placesWithin, placeTree } from './placeTree'
import type { StorageLocation } from './storageLocationApi'

// fictitious, sorted per level as the API delivers them
const place = (id: string, name: string, parentId: string | null = null) => ({ id, name, parentId, active: true }) as StorageLocation
const locations = [
  place('og', '1. OG'),
  place('k', 'Keller'),
  place('r2', 'Regal 2', 'b'),
  place('b', 'Büro', 'og'),
  place('s3', 'Schublade 3', 'r2'),
  place('r1', 'Regal 1', 'k'),
]

describe('placeTree', () => {
  it('every place followed by the ones inside it, with its path', () => {
    expect(placeTree(locations).map((p) => `${p.depth} ${p.path}`)).toEqual([
      '0 1. OG',
      '1 1. OG › Büro',
      '2 1. OG › Büro › Regal 2',
      '3 1. OG › Büro › Regal 2 › Schublade 3',
      '0 Keller',
      '1 Keller › Regal 1',
    ])
  })

  it('a place whose parent is missing is top level', () => {
    expect(placeTree([place('x', 'Fach', 'gone')]).map((p) => p.path)).toEqual(['Fach'])
  })
})

describe('placesWithin', () => {
  it('a place includes everything inside it, as deep as it goes', () => {
    const within = placesWithin(locations)
    expect([...within.get('og')!].sort()).toEqual(['b', 'og', 'r2', 's3'])
    expect([...within.get('s3')!]).toEqual(['s3'])
  })
})
