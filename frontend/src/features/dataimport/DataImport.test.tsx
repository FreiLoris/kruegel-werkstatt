import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataImport } from './DataImport'
import type { ImportPreview, ImportResult, ImportSettings } from './dataImportApi'

const PREVIEW: ImportPreview = {
  rowCount: 2,
  charset: 'UTF-8',
  columns: [
    { index: 0, header: 'Kd-Nr', samples: ['17', '18'], suggested: null },
    { index: 1, header: 'Nachname', samples: ['Huber', 'Meier'], suggested: 'LAST_NAME' },
    { index: 2, header: 'Kennzeichen', samples: ['ZH 12345', ''], suggested: 'LICENSE_PLATE' },
  ],
}
const RESULT: ImportResult = {
  dryRun: true,
  rowsRead: 2,
  customersCreated: 2,
  customersExisting: 0,
  vehiclesCreated: 1,
  vehiclesExisting: 0,
  vehiclesSkipped: 0,
  skipped: 0,
  problems: ['Zeile 3: Fahrzeug nicht übernommen – Marke und Modell fehlen'],
}

let canEdit = true
let previewData: ImportPreview | undefined
const sent: ImportSettings[] = []
const previewMutate = vi.fn((_: unknown, options: { onSuccess: (p: ImportPreview) => void }) => {
  previewData = PREVIEW
  options.onSuccess(PREVIEW)
})
const importMutate = vi.fn((variables: { settings: ImportSettings }, options: { onSuccess: (r: ImportResult) => void }) => {
  sent.push(variables.settings)
  options.onSuccess({ ...RESULT, dryRun: variables.settings.dryRun ?? false })
})

vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => canEdit }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('./dataImportApi', () => ({
  useImportPreview: () => ({
    data: previewData,
    mutate: previewMutate,
    isPending: false,
    error: null,
    reset: () => (previewData = undefined),
  }),
  useImportData: () => ({ mutate: importMutate, isPending: false, error: null, reset: vi.fn() }),
}))

afterEach(() => {
  canEdit = true
  previewData = undefined
  sent.length = 0
  previewMutate.mockClear()
  importMutate.mockClear()
  localStorage.clear()
})

function chooseFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File(['x'], 'kunden.csv', { type: 'text/csv' })] } })
}

describe('DataImport (neutral 5)', () => {
  it('a file: its columns with the suggested fields and examples', () => {
    render(<DataImport />)
    chooseFile()

    expect(screen.getByText('kunden.csv')).toBeTruthy()
    expect((screen.getByLabelText('Nachname') as HTMLSelectElement).value).toBe('LAST_NAME')
    expect((screen.getByLabelText('Kd-Nr') as HTMLSelectElement).value).toBe('')
    expect(screen.getByText('z. B. Huber · Meier')).toBeTruthy()
  })

  it('without a name column no dry run – it says why', () => {
    render(<DataImport />)
    chooseFile()
    fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: '' } })

    expect(screen.getByText(/«Name» oder «Firma»/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Probelauf' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('dry run first, then "Jetzt übernehmen" – with the columns as mapped', () => {
    render(<DataImport />)
    chooseFile()

    fireEvent.click(screen.getByRole('button', { name: 'Probelauf' }))
    const dryRun = screen.getByRole('region', { name: 'Probelauf – noch nichts gespeichert' })
    expect(within(dryRun).getByText('2 Zeilen gelesen: 2 Kunden neu · 1 Fahrzeug neu')).toBeTruthy()
    expect(within(dryRun).getByText('Zeile 3: Fahrzeug nicht übernommen – Marke und Modell fehlen')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt übernehmen' }))
    expect(sent.map((s) => s.dryRun)).toEqual([true, false])
    expect(sent[1].columns).toEqual([
      { index: 1, field: 'LAST_NAME' },
      { index: 2, field: 'LICENSE_PLATE' },
    ])
    expect(screen.getByRole('region', { name: 'Übernommen' })).toBeTruthy()
  })

  it('a changed mapping needs a new dry run', () => {
    render(<DataImport />)
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Probelauf' }))

    fireEvent.change(screen.getByLabelText('Kd-Nr'), { target: { value: 'COMPANY' } })

    expect(screen.queryByRole('button', { name: 'Jetzt übernehmen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Probelauf' })).toBeTruthy()
  })

  it('the same columns again: the mapping of last time', () => {
    render(<DataImport />)
    chooseFile()
    fireEvent.change(screen.getByLabelText('Kd-Nr'), { target: { value: 'COMPANY' } })
    fireEvent.click(screen.getByRole('button', { name: 'Probelauf' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt übernehmen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Datei übernehmen' }))

    chooseFile()

    expect((screen.getByLabelText('Kd-Nr') as HTMLSelectElement).value).toBe('COMPANY')
  })

  it('a device on "Nur ansehen" cannot take over', () => {
    canEdit = false
    render(<DataImport />)

    expect(screen.getByText(/zuerst oben rechts eine Person wählen/)).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
