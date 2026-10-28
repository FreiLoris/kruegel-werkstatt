import type { StorageLocation } from './storageLocationApi'

/** Between the levels of a path: "1. OG › Büro › Regal 2" */
export const PATH_SEPARATOR = ' › '

export interface Place {
  location: StorageLocation
  /** 0 = top level */
  depth: number
  /** names from the top level down, e.g. "Büro › Regal 2" */
  path: string
  /**
   * What is shown (FB-23): its code in front – "KA01 · Keller › Treppe"; one without a code shows the
   * code of the nearest place above it – "KA01 › oberes Fach"; no code anywhere above: the path
   */
  label: string
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
    const list = children.get(parent)
    if (list) list.push(location)
    else children.set(parent, [location])
  }
  const result: Place[] = []
  /** @param coded the nearest place above with a code, and the names below it */
  const visit = (parent: string | null, depth: number, prefix: string, coded: { code: string; below: string } | null) => {
    for (const location of children.get(parent) ?? []) {
      const path = prefix + location.name
      const own = location.code ? { code: location.code, below: '' } : null
      const inherited = coded && { code: coded.code, below: coded.below + PATH_SEPARATOR + location.name }
      const label = own ? `${own.code} · ${path}` : inherited ? inherited.code + inherited.below : path
      result.push({ location, depth, path, label })
      visit(location.id, depth + 1, path + PATH_SEPARATOR, own ?? inherited)
    }
  }
  visit(null, 0, '', null)
  return result
}

/** Every place with everything inside it (itself included) – a filter for "Büro" shows the shelves in it too */
export function placesWithin(locations: StorageLocation[]): Map<string, Set<string>> {
  const within = new Map(locations.map((l) => [l.id, new Set([l.id])]))
  const byId = new Map(locations.map((l) => [l.id, l]))
  for (const location of locations) {
    // walk up from each place and add it to all of its parents (a loop cannot come from the server; guarded anyway)
    let parent = location.parentId
    const seen = new Set<string>()
    while (parent && within.has(parent) && !seen.has(parent)) {
      seen.add(parent)
      within.get(parent)!.add(location.id)
      parent = byId.get(parent)?.parentId ?? null
    }
  }
  return within
}
