import type { StorageLocation } from './storageLocationApi'

/** Between the levels of a path: "1. OG › Büro › Regal 2" */
export const PATH_SEPARATOR = ' › '

export interface Place {
  location: StorageLocation
  /** 0 = top level */
  depth: number
  /** names from the top level down, e.g. "Büro › Regal 2" */
  path: string
}

/**
 * The storage locations as a tree (13f), flattened in reading order: every place followed by the
 * ones inside it, each level in the order of the settings. Expects the list as the API delivers it
 * (sorted per level). A place whose parent is missing counts as top level – nothing gets lost.
 */
export function placeTree(locations: StorageLocation[]): Place[] {
  const ids = new Set(locations.map((l) => l.id))
  const children = new Map<string | null, StorageLocation[]>()
  for (const location of locations) {
    const parent = location.parentId && ids.has(location.parentId) ? location.parentId : null
    children.set(parent, [...(children.get(parent) ?? []), location])
  }
  const result: Place[] = []
  const visit = (parent: string | null, depth: number, prefix: string) => {
    for (const location of children.get(parent) ?? []) {
      const path = prefix + location.name
      result.push({ location, depth, path })
      visit(location.id, depth + 1, path + PATH_SEPARATOR)
    }
  }
  visit(null, 0, '')
  return result
}

/** Every place with everything inside it (itself included) – a filter for "Büro" shows the shelves in it too */
export function placesWithin(locations: StorageLocation[]): Map<string, Set<string>> {
  const within = new Map(locations.map((l) => [l.id, new Set([l.id])]))
  for (const location of locations) {
    // walk up from each place and add it to all of its parents (a loop cannot come from the server; guarded anyway)
    let parent = location.parentId
    const seen = new Set<string>()
    while (parent && within.has(parent) && !seen.has(parent)) {
      seen.add(parent)
      within.get(parent)!.add(location.id)
      parent = locations.find((l) => l.id === parent)?.parentId ?? null
    }
  }
  return within
}
