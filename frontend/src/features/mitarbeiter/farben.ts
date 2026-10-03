/**
 * Personenfarben: Jede Person hat eine Farbe (Pinnwand-Spalte, Kalender, Namensschild).
 *
 * Die Vorschläge liegen auf dem Farbkreis weit auseinander, damit man sie auch auf dem
 * Werkstatt-TV aus Distanz unterscheidet (UI-Review: früher 2× Grün, 2× Blau fast gleich).
 */

export interface Farbvorschlag {
  name: string
  wert: string
}

export const FARBVORSCHLAEGE: readonly Farbvorschlag[] = [
  { name: 'Gelb', wert: '#f6d860' },
  { name: 'Orange', wert: '#ffb366' },
  { name: 'Rot', wert: '#ff9f9f' },
  { name: 'Pink', wert: '#f59ad8' },
  { name: 'Violett', wert: '#d4b0f0' },
  { name: 'Blau', wert: '#9fc8f0' },
  { name: 'Türkis', wert: '#6fd6cf' },
  { name: 'Grün', wert: '#9fdfaa' },
  { name: 'Braun', wert: '#c9a27a' },
  { name: 'Grau', wert: '#b8bcc4' },
]

/** Erste vorgeschlagene Farbe, die noch niemand hat (sonst die erste überhaupt). */
export function freieFarbe(belegt: readonly string[]): string {
  const vergeben = new Set(belegt.map((f) => f.toLowerCase()))
  return (FARBVORSCHLAEGE.find((f) => !vergeben.has(f.wert)) ?? FARBVORSCHLAEGE[0]).wert
}

export type Textton = 'hell' | 'dunkel'

/**
 * Welche Schrift ist auf dieser Hintergrundfarbe besser lesbar: helle oder dunkle?
 *
 * Gerechnet wird mit dem Kontrastverhältnis nach WCAG – dieselbe Formel, mit der man
 * Barrierefreiheit prüft. So bleibt jeder Name lesbar, auch bei einer selbst gewählten Farbe.
 */
export function textAufFarbe(hex: string): Textton {
  const hintergrund = helligkeit(hex)
  // Helligkeit unserer beiden Textfarben (--farbe-text #f1f2f4 und --farbe-hintergrund #111214)
  const hellerText = 0.885
  const dunklerText = 0.0063
  const kontrastHell = (hellerText + 0.05) / (hintergrund + 0.05)
  const kontrastDunkel = (hintergrund + 0.05) / (dunklerText + 0.05)
  return kontrastDunkel >= kontrastHell ? 'dunkel' : 'hell'
}

/** Relative Helligkeit nach WCAG 2 (0 = schwarz, 1 = weiss). */
function helligkeit(hex: string): number {
  const treffer = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!treffer) {
    throw new Error(`Keine Farbe im Format #rrggbb: "${hex}"`)
  }
  const [r, g, b] = treffer.slice(1).map((teil) => {
    const kanal = parseInt(teil, 16) / 255
    return kanal <= 0.04045 ? kanal / 12.92 : ((kanal + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
