import type { Season, TireSet } from './tireHotelApi'

/**
 * The tyres of a vehicle at a glance (FB-12): per season the set used last – summer and winter –
 * the older ones only counted (sets replaced by new tyres stay in the history). Pure, tested.
 */
export interface SeasonTires {
  season: Season
  set: TireSet
  /** further, older sets of that season */
  older: number
}

const ORDER: Season[] = ['SUMMER', 'WINTER', 'ALL_SEASON']

/**
 * When a set was used last – measured, stored or retrieved; not when its data were corrected (an old
 * set with a fixed remark is not the current one). Never any of these: when it was saved.
 */
const lastUsed = (set: TireSet) =>
  [set.measuredOn, set.retrievedOn, set.storedOn].filter((d): d is string => !!d).sort().at(-1) ?? set.updatedAt.slice(0, 10)

export function tireOverview(sets: TireSet[]): SeasonTires[] {
  return ORDER.flatMap((season) => {
    const ofSeason = sets.filter((s) => s.season === season).sort((a, b) => lastUsed(b).localeCompare(lastUsed(a)))
    return ofSeason.length === 0 ? [] : [{ season, set: ofSeason[0], older: ofSeason.length - 1 }]
  })
}
