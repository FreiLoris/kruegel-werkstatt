/**
 * Person colors: every person has a color (pinboard column, calendar, name badge).
 *
 * The suggestions are far apart on the color wheel so they can be told apart even on the
 * workshop TV from a distance (UI review: there used to be 2× green, 2× blue almost alike).
 */

export interface ColorSuggestion {
  /** Visible name (German) */
  name: string
  value: string
}

export const COLOR_SUGGESTIONS: readonly ColorSuggestion[] = [
  { name: 'Gelb', value: '#f6d860' },
  { name: 'Orange', value: '#ffb366' },
  { name: 'Rot', value: '#ff9f9f' },
  { name: 'Pink', value: '#f59ad8' },
  { name: 'Violett', value: '#d4b0f0' },
  { name: 'Blau', value: '#9fc8f0' },
  { name: 'Türkis', value: '#6fd6cf' },
  { name: 'Grün', value: '#9fdfaa' },
  { name: 'Braun', value: '#c9a27a' },
  { name: 'Grau', value: '#b8bcc4' },
]

/** First suggested color nobody has yet (otherwise the very first one). */
export function freeColor(taken: readonly string[]): string {
  const used = new Set(taken.map((c) => c.toLowerCase()))
  return (COLOR_SUGGESTIONS.find((c) => !used.has(c.value)) ?? COLOR_SUGGESTIONS[0]).value
}

export type TextTone = 'light' | 'dark'

/**
 * Which text is easier to read on this background color: light or dark?
 *
 * Uses the contrast ratio from WCAG – the same formula used to check accessibility.
 * That way every name stays readable, even with a custom color.
 */
export function textOn(hex: string): TextTone {
  const background = luminance(hex)
  // Luminance of our two text colors (--color-text #f1f2f4 and --color-background #111214)
  const lightText = 0.885
  const darkText = 0.0063
  const contrastLight = (lightText + 0.05) / (background + 0.05)
  const contrastDark = (background + 0.05) / (darkText + 0.05)
  return contrastDark >= contrastLight ? 'dark' : 'light'
}

/** Relative luminance according to WCAG 2 (0 = black, 1 = white). */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) {
    throw new Error(`Not a color in #rrggbb format: "${hex}"`)
  }
  const [r, g, b] = match.slice(1).map((part) => {
    const channel = parseInt(part, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
