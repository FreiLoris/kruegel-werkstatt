import type { Task } from '../taskApi'
import { NEW_TIRES_DEFAULT_COUNT } from '../wizard/appointmentForm'

/** The tire change: wheels or only tires, from the tire hotel or brought by the customer. */
export interface TiresBlock {
  kind: 'tires'
  /** mounted from the tire hotel – else brought (or not said) */
  stored: boolean
  /** complete wheels (rims matter) – else only tires */
  wheels: boolean
  /** new tires ordered for the customer (FB-25): how many, of which dimension (may be open) */
  newTires?: { count: number; dimension: string | null }
}

/** Insurance case: the insurance with its phone and the claim number (or a line to write it on). */
export interface InsuranceBlock {
  kind: 'insurance'
}

/** The MFK (FB-10): station with address and phone, appointment, duration and who drives. */
export interface MfkBlock {
  kind: 'mfk'
}

export type SheetBlock = TiresBlock | MfkBlock | InsuranceBlock

/**
 * The blocks of the task sheet between the work list and the remarks (FB-06): the sheet is put
 * together from what was ticked when the task was taken – no templates. Each option may add a
 * block, several combine. Service and parts get theirs later (the workshop defines them):
 * one more kind here and one more component on the sheet.
 */
export function sheetBlocks(
  task: Pick<Task, 'tireChange' | 'tireChangeKind' | 'newTiresCount' | 'newTiresDimension' | 'mfk' | 'insuranceId'>,
): SheetBlock[] {
  const blocks: SheetBlock[] = []
  if (task.tireChange) {
    const kind = task.tireChangeKind
    blocks.push({
      kind: 'tires',
      stored: kind === 'WHEELS_STORED' || kind === 'TIRES_STORED',
      wheels: kind !== 'TIRES_STORED' && kind !== 'TIRES_BROUGHT' && kind !== 'NEW_TIRES',
      ...(kind === 'NEW_TIRES' && { newTires: { count: task.newTiresCount ?? NEW_TIRES_DEFAULT_COUNT, dimension: task.newTiresDimension } }),
    })
  }
  if (task.mfk) blocks.push({ kind: 'mfk' })
  if (task.insuranceId) blocks.push({ kind: 'insurance' })
  return blocks
}
