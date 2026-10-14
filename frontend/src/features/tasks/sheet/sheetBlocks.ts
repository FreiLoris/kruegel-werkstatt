import type { Task } from '../taskApi'

/** The tire change: wheels or only tires, from the tire hotel or brought by the customer. */
export interface TiresBlock {
  kind: 'tires'
  /** mounted from the tire hotel – else brought (or not said) */
  stored: boolean
  /** complete wheels (rims matter) – else only tires */
  wheels: boolean
}

/** Insurance case: the insurance with its phone and the claim number (or a line to write it on). */
export interface InsuranceBlock {
  kind: 'insurance'
}

export type SheetBlock = TiresBlock | InsuranceBlock

/**
 * The blocks of the task sheet between the work list and the remarks (FB-06): the sheet is put
 * together from what was ticked when the task was taken – no templates. Each option may add a
 * block, several combine. MFK, service and parts get theirs later (the workshop defines them):
 * one more kind here and one more component on the sheet.
 */
export function sheetBlocks(task: Pick<Task, 'tireChange' | 'tireChangeKind' | 'insuranceId'>): SheetBlock[] {
  const blocks: SheetBlock[] = []
  if (task.tireChange) {
    const kind = task.tireChangeKind
    blocks.push({
      kind: 'tires',
      stored: kind === 'WHEELS_STORED' || kind === 'TIRES_STORED',
      wheels: kind !== 'TIRES_STORED' && kind !== 'TIRES_BROUGHT',
    })
  }
  if (task.insuranceId) blocks.push({ kind: 'insurance' })
  return blocks
}
