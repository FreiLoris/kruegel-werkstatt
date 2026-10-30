import { afterEach, describe, expect, it } from 'vitest'
import type { ImportResult } from './dataImportApi'
import { mappingProblems, rememberedMapping, rememberMapping, resultText, rowsText } from './importFields'

const NOTHING: ImportResult = {
  dryRun: true,
  rowsRead: 0,
  customersCreated: 0,
  customersExisting: 0,
  vehiclesCreated: 0,
  vehiclesExisting: 0,
  vehiclesSkipped: 0,
  skipped: 0,
  problems: [],
}

afterEach(() => localStorage.clear())

describe('importFields (neutral 5)', () => {
  it('needs a name or a company, a date or number only once', () => {
    expect(mappingProblems(['LAST_NAME', null])).toEqual([])
    expect(mappingProblems(['COMPANY'])).toEqual([])
    expect(mappingProblems(['STREET', 'STREET', 'LAST_NAME'])).toEqual([])
    expect(mappingProblems(['CITY'])).toEqual(['Mindestens eine Spalte als «Name» oder «Firma» zuordnen.'])
    expect(mappingProblems(['LAST_NAME', 'MILEAGE', 'MILEAGE'])).toEqual([
      '«Kilometerstand» ist mehreren Spalten zugeordnet – nur eine geht.',
    ])
  })

  it('counts in words – one and many', () => {
    expect(rowsText(1)).toBe('1 Zeile')
    expect(rowsText(1234)).toBe('1’234 Zeilen')
    expect(resultText({ ...NOTHING, customersCreated: 1, vehiclesCreated: 1, skipped: 1 })).toBe(
      '1 Kunde neu · 1 Fahrzeug neu · 1 Zeile übersprungen',
    )
    expect(resultText({ ...NOTHING, customersCreated: 4, customersExisting: 1, vehiclesCreated: 3, vehiclesSkipped: 2 })).toBe(
      '4 Kunden neu, 1 schon vorhanden · 3 Fahrzeuge neu, 2 nicht übernommen',
    )
  })

  it('remembers the mapping for the same columns only', () => {
    rememberMapping(['Name', 'Ort'], ['LAST_NAME', 'CITY'])

    expect(rememberedMapping(['Name', 'Ort'])).toEqual(['LAST_NAME', 'CITY'])
    expect(rememberedMapping(['Name', 'PLZ'])).toBeNull()
    expect(rememberedMapping(['Name'])).toBeNull()
  })

  it('stored data that does not fit is ignored – no field the backend does not know is sent', () => {
    localStorage.setItem('dataImport.mapping', JSON.stringify({ headers: ['Name'], mapping: ['GONE'] }))
    expect(rememberedMapping(['Name'])).toBeNull()

    localStorage.setItem('dataImport.mapping', '{not json')
    expect(rememberedMapping(['Name'])).toBeNull()

    localStorage.setItem('dataImport.mapping', JSON.stringify({ headers: ['Name'], mapping: [] }))
    expect(rememberedMapping(['Name'])).toBeNull()
  })
})
