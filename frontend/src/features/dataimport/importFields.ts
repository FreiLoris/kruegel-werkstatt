import { formatCount } from '../../lib/format'
import type { ImportField, ImportResult } from './dataImportApi'

/** The fields a column can be, in the order of the choice – UI texts, hence German */
export const FIELD_GROUPS: { title: string; fields: { field: ImportField; label: string }[] }[] = [
  {
    title: 'Kunde',
    fields: [
      { field: 'LAST_NAME', label: 'Name' },
      { field: 'FIRST_NAME', label: 'Vorname' },
      { field: 'COMPANY', label: 'Firma' },
      { field: 'SALUTATION', label: 'Anrede' },
      { field: 'ADDITION', label: 'Zusatz' },
      { field: 'STREET', label: 'Strasse (auch Hausnummer)' },
      { field: 'POSTAL_CODE', label: 'PLZ' },
      { field: 'CITY', label: 'Ort' },
      { field: 'POSTAL_CODE_CITY', label: 'PLZ und Ort zusammen' },
      { field: 'PHONE', label: 'Telefon' },
      { field: 'MOBILE', label: 'Handy' },
      { field: 'EMAIL', label: 'E-Mail' },
    ],
  },
  {
    title: 'Fahrzeug',
    fields: [
      { field: 'LICENSE_PLATE', label: 'Kontrollschild' },
      { field: 'MAKE', label: 'Marke' },
      { field: 'MODEL', label: 'Modell' },
      { field: 'VIN', label: 'Fahrgestellnummer' },
      { field: 'FIRST_REGISTRATION', label: '1. Inverkehrsetzung' },
      { field: 'MODEL_YEAR', label: 'Jahrgang' },
      { field: 'MILEAGE', label: 'Kilometerstand' },
      { field: 'LAST_MFK', label: 'Letzte MFK' },
      { field: 'COLOR', label: 'Farbe' },
      { field: 'FUEL', label: 'Treibstoff' },
    ],
  },
]

const LABELS = new Map(FIELD_GROUPS.flatMap((group) => group.fields.map((f) => [f.field, f.label] as const)))

/** Text may come from several columns (joined) – dates and numbers not; same rule as the backend */
const SINGLE: ReadonlySet<ImportField> = new Set(['FIRST_REGISTRATION', 'MODEL_YEAR', 'MILEAGE', 'LAST_MFK'])

/** One entry per column of the file; `null` = not taken over */
export type Mapping = (ImportField | null)[]

/** What is missing or wrong before the dry run – empty: ready */
export function mappingProblems(mapping: Mapping): string[] {
  const problems: string[] = []
  if (!mapping.includes('LAST_NAME') && !mapping.includes('COMPANY')) {
    problems.push('Mindestens eine Spalte als «Name» oder «Firma» zuordnen.')
  }
  for (const field of SINGLE) {
    if (mapping.filter((f) => f === field).length > 1) {
      problems.push(`«${LABELS.get(field)}» ist mehreren Spalten zugeordnet – nur eine geht.`)
    }
  }
  return problems
}

/** "4 Kunden neu, 1 schon vorhanden · 3 Fahrzeuge neu · 1 Zeile übersprungen" */
export function resultText(result: ImportResult): string {
  const customers = [
    `${formatCount(result.customersCreated)} ${result.customersCreated === 1 ? 'Kunde' : 'Kunden'} neu`,
    result.customersExisting > 0 && `${formatCount(result.customersExisting)} schon vorhanden`,
  ]
  const vehicles = [
    `${formatCount(result.vehiclesCreated)} ${result.vehiclesCreated === 1 ? 'Fahrzeug' : 'Fahrzeuge'} neu`,
    result.vehiclesExisting > 0 && `${formatCount(result.vehiclesExisting)} schon vorhanden`,
    result.vehiclesSkipped > 0 && `${formatCount(result.vehiclesSkipped)} nicht übernommen`,
  ]
  const skipped = result.skipped > 0 && `${formatCount(result.skipped)} ${result.skipped === 1 ? 'Zeile' : 'Zeilen'} übersprungen`
  return [customers.filter(Boolean).join(', '), vehicles.filter(Boolean).join(', '), skipped].filter(Boolean).join(' · ')
}

const STORAGE_KEY = 'dataImport.mapping'

/**
 * The mapping of the last import, if the file has the same columns – a corrected file then does
 * not need everything set again. Only in this browser; without storage simply none.
 */
export function rememberedMapping(headers: string[]): Mapping | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { headers: string[]; mapping: Mapping } | null
    const same = stored?.headers.length === headers.length && stored.headers.every((h, i) => h === headers[i])
    return same ? stored.mapping : null
  } catch {
    return null
  }
}

export function rememberMapping(headers: string[], mapping: Mapping) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ headers, mapping }))
  } catch {
    // no storage (private mode) – next time the suggestions again
  }
}
