import { describe, expect, it } from 'vitest'
import { fontSize, spots, spotsFrom, startPositions } from './labelSheet'
import type { LabelFormat } from './tireHotelApi'

// 3 × 8 labels of 70 × 37 mm, like the 24 per sheet
const sheet24 = { columns: 3, rows: 8, widthMm: 70, heightMm: 37, marginTop: 0.5, marginLeft: 0, gapX: 0, gapY: 0 } as LabelFormat
// 5 × 13 small ones with margins and gaps, like the 65 per sheet
const sheet65 = { columns: 5, rows: 13, widthMm: 38, heightMm: 21.2, marginTop: 10.7, marginLeft: 4.7, gapX: 2.5, gapY: 0 } as LabelFormat

describe('labelSheet', () => {
  it('the places row by row, from the margins, with the gaps between', () => {
    const all = spots(sheet65)
    expect(all).toHaveLength(65)
    expect(all[0]).toEqual({ position: 1, left: 4.7, top: 10.7 })
    expect(all[1].left).toBeCloseTo(45.2)
    expect(all[5]).toMatchObject({ position: 6, left: 4.7 })
    expect(all[5].top).toBeCloseTo(31.9)
  })

  it('an opened sheet: start where the free labels begin – the four of a set must still fit', () => {
    expect(startPositions(sheet24)).toHaveLength(21)
    expect(startPositions(sheet24).at(-1)).toBe(21)
    expect(spotsFrom(sheet24, 3).map((s) => s.position)).toEqual([3, 4, 5, 6])
    // from place 3 the second label is already in the next row
    expect(spotsFrom(sheet24, 3)[1]).toMatchObject({ left: 0, top: 37.5 })
  })

  it('a text size for small and big labels', () => {
    // the narrow label limits it: 38 mm wide
    expect(fontSize(sheet65)).toBeCloseTo(2.71, 1)
    expect(fontSize(sheet24)).toBeCloseTo(4.2)
  })
})
