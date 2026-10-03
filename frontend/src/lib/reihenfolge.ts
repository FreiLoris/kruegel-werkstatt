/**
 * Element um eine Position nach vorne (-1) oder hinten (+1) schieben – für die ↑/↓-Knöpfe
 * in Listen mit fester Reihenfolge (Mitarbeiter, Lifts, …). Gibt eine neue Liste zurück.
 */
export function verschoben<T>(liste: readonly T[], index: number, richtung: -1 | 1): T[] {
  const ziel = index + richtung
  const neu = [...liste]
  if (ziel < 0 || ziel >= neu.length) return neu
  ;[neu[index], neu[ziel]] = [neu[ziel], neu[index]]
  return neu
}
