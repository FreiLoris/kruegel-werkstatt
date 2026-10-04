/**
 * Move an element one position up (-1) or down (+1) – for the ↑/↓ buttons in lists with a
 * fixed order (employees, lifts, …). Returns a new list.
 */
export function moved<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  const result = [...list]
  if (target < 0 || target >= result.length) return result
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}
