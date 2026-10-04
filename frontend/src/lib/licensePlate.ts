/**
 * License plates: stored as ONE text (backend `LicensePlates.normalize`), shown and edited in parts.
 *
 *   "SG 197052"     → Swiss plate: canton SG, number 197052
 *   "D M-AB 1234"   → foreign plate: country D, number "M-AB 1234"
 *   anything else   → shown as typed (old data that fits neither form)
 */

export interface Canton {
  code: string
  /** German name, shown in the canton selection */
  name: string
}

export const CANTONS: readonly Canton[] = [
  { code: 'AG', name: 'Aargau' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'BE', name: 'Bern' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' },
  { code: 'GE', name: 'Genf' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Waadt' },
  { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' },
]

/** International vehicle codes for foreign plates (German names), most common first */
export const COUNTRIES: readonly { code: string; name: string }[] = [
  { code: 'D', name: 'Deutschland' },
  { code: 'A', name: 'Österreich' },
  { code: 'F', name: 'Frankreich' },
  { code: 'I', name: 'Italien' },
  { code: 'FL', name: 'Liechtenstein' },
  { code: 'NL', name: 'Niederlande' },
  { code: 'B', name: 'Belgien' },
  { code: 'L', name: 'Luxemburg' },
  { code: 'E', name: 'Spanien' },
  { code: 'P', name: 'Portugal' },
  { code: 'GB', name: 'Grossbritannien' },
  { code: 'PL', name: 'Polen' },
  { code: 'CZ', name: 'Tschechien' },
  { code: 'H', name: 'Ungarn' },
  { code: 'HR', name: 'Kroatien' },
  { code: 'SLO', name: 'Slowenien' },
  { code: 'RO', name: 'Rumänien' },
  { code: 'GR', name: 'Griechenland' },
  { code: 'TR', name: 'Türkei' },
]

export type ParsedPlate =
  | { kind: 'swiss'; canton: string; number: string }
  | { kind: 'foreign'; country: string; number: string }
  | { kind: 'other'; text: string }

const CANTON_CODES = new Set(CANTONS.map((c) => c.code))
const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code))

/**
 * Splits a stored plate into its parts. Swiss first: "GR 12345" (digits only) is Graubünden,
 * "GR ABC-1234" is Greece – the same rule as in the backend.
 */
export function parsePlate(text: string): ParsedPlate {
  const value = text.trim().toUpperCase()
  const swiss = /^([A-Z]{2}) (\d{1,6})$/.exec(value)
  if (swiss && CANTON_CODES.has(swiss[1])) {
    return { kind: 'swiss', canton: swiss[1], number: swiss[2] }
  }
  const foreign = /^([A-Z]{1,3}) (.+)$/.exec(value)
  if (foreign && COUNTRY_CODES.has(foreign[1])) {
    return { kind: 'foreign', country: foreign[1], number: foreign[2] }
  }
  return { kind: 'other', text: value }
}

/** Parts → stored text. Without a number there is no plate (empty text). */
export function composePlate(plate: ParsedPlate): string {
  switch (plate.kind) {
    case 'swiss': {
      const digits = plate.number.replace(/\D/g, '')
      return digits ? `${plate.canton} ${digits}` : ''
    }
    case 'foreign': {
      const number = plate.number.trim().replace(/\s+/g, ' ').toUpperCase()
      return number ? `${plate.country} ${number}` : ''
    }
    case 'other':
      return plate.text.trim().toUpperCase()
  }
}

/** "197052" → "197 052", like on the real plate (groups of three from the right). */
export function groupDigits(number: string): string {
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
