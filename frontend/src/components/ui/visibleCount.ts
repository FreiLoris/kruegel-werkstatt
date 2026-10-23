/**
 * How many items of a list stay visible (FittingList): every item whose bottom is inside the list –
 * from the first one sticking out on, none (the order matters: the earliest appointment first). If
 * some do not fit, the "+ n weitere" line needs room too: then the items are counted against the
 * limit minus that line.
 *
 * @param bottoms where each item ends, all items shown, top to bottom
 * @param limit   where the list ends
 * @param moreLine the height of the "+ n weitere" line
 */
export function visibleCount(bottoms: readonly number[], limit: number, moreLine: number): number {
  // half a pixel: rounding of the browser, not an item sticking out
  const fitting = (bound: number) => {
    const first = bottoms.findIndex((bottom) => bottom > bound + 0.5)
    return first === -1 ? bottoms.length : first
  }
  const all = fitting(limit)
  return all === bottoms.length ? all : fitting(limit - moreLine)
}
