import type { LabelFormat, TireSet } from './tireHotelApi'
import { WHEELS } from './tread'

/**
 * Where the labels of a set go on an A4 sheet (FB-07, 13p) – in mm from the top left corner.
 * Pure functions, tested.
 */

/** The four labels of a set: one per wheel */
export const LABELS_PER_SET = WHEELS.length

export interface LabelSpot {
  /** 1 = top left, counted row by row */
  position: number
  left: number
  top: number
}

const mm = (value: number | string) => Number(value)

/** Every place on the sheet, row by row – as the sheet is numbered */
export function spots(format: LabelFormat): LabelSpot[] {
  const result: LabelSpot[] = []
  for (let row = 0; row < format.rows; row++) {
    for (let column = 0; column < format.columns; column++) {
      result.push({
        position: row * format.columns + column + 1,
        left: mm(format.marginLeft) + column * (mm(format.widthMm) + mm(format.gapX)),
        top: mm(format.marginTop) + row * (mm(format.heightMm) + mm(format.gapY)),
      })
    }
  }
  return result
}

/**
 * The start positions that still leave room for all labels of a set – an opened sheet is used up
 * from where its free labels begin.
 */
export function startPositions(format: LabelFormat, count = LABELS_PER_SET): number[] {
  const last = format.columns * format.rows - count + 1
  return Array.from({ length: Math.max(last, 0) }, (_, i) => i + 1)
}

/** The spots taken from {@code start} on – one per label */
export function spotsFrom(format: LabelFormat, start: number, count = LABELS_PER_SET): LabelSpot[] {
  return spots(format).slice(start - 1, start - 1 + count)
}

/** A text size that fits five lines on the label – small labels (21 mm) and big ones (37 mm) alike, in mm */
export function fontSize(format: LabelFormat): number {
  return Math.min(Math.max(mm(format.heightMm) / 7.5, 2.2), 4.2, mm(format.widthMm) / 14)
}

/** "Huber Peter · ZH 123456" – who the tyres belong to */
export function ownerLine(set: TireSet): string {
  return [set.customer.displayName, set.vehicle?.licensePlate].filter(Boolean).join(' · ')
}
