import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { countsText } from './importCounts'
import { ImportResult } from './ImportResult'
import type { ImportRun } from './swissGarageApi'

function run(overrides: Partial<ImportRun> = {}): ImportRun {
  return {
    id: '1',
    kind: 'CUSTOMERS',
    fileName: 'Adrliste.xlsx',
    importedAt: '2026-10-04T15:30:00Z',
    importedBy: null,
    rowsRead: 1500,
    skipped: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    deactivated: 0,
    problems: [],
    ...overrides,
  }
}

describe('countsText', () => {
  it('lists only counts that are not 0, with thousands separator', () => {
    expect(countsText(run({ created: 12, unchanged: 1480, deactivated: 2 }))).toBe('12 neu · 1’480 unverändert · 2 deaktiviert')
  })

  it('says so when nothing was imported', () => {
    expect(countsText(run())).toBe('keine Einträge')
  })
})

describe('ImportResult', () => {
  it('shows rows read and counts, no problem box without problems', () => {
    render(<ImportResult run={run({ created: 3 })} />)

    expect(screen.getByText('1’500 Zeilen gelesen: 3 neu')).toBeTruthy()
    expect(screen.queryByText(/Hinweis/)).toBeNull()
  })

  it('shows the first problems and hides the rest behind "alle anzeigen"', () => {
    const problems = Array.from({ length: 7 }, (_, i) => `Zeile ${i + 2}: kein Name`)
    render(<ImportResult run={run({ skipped: 7, problems })} />)

    expect(screen.getByText('7 Hinweise')).toBeTruthy()
    expect(screen.getByText('alle 7 anzeigen')).toBeTruthy()
    // the hidden ones are in the closed <details>
    expect(screen.getByText('Zeile 8: kein Name').closest('details')?.open).toBe(false)
    expect(screen.getByText('Zeile 2: kein Name').closest('details')).toBeNull()
  })
})
