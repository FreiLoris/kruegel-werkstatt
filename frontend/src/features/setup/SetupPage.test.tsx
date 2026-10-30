import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { unsavedChanges } from '../../app/unsavedChanges'
import { SetupPage } from './SetupPage'

const complete = vi.fn()
let answer = true
let asked = false
let canEdit = true
let setupDone = false
const UNSAVED = Symbol('test form')

vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('../../components/ui/confirmContext', () => ({
  useConfirm: () => () => {
    asked = true
    return Promise.resolve(answer)
  },
}))
vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => canEdit }))
vi.mock('../company/companyApi', () => ({
  useCompany: () => ({ data: { setupDone } }),
  useCompleteSetup: () => ({ mutate: complete, isPending: false }),
}))
vi.mock('../modules/moduleApi', () => import('../../test/allModulesOn'))
// the forms of the settings – tested there
vi.mock('../company/CompanySettings', () => ({ CompanySettings: () => <p>Firmenformular</p> }))
vi.mock('../modules/ModuleSettingsForm', () => ({ ModuleSettingsForm: () => <p>Modulformular</p> }))
vi.mock('../publicholidays/PublicHolidaySettingsForm', () => ({ PublicHolidaySettingsForm: () => <p>Feiertagsformular</p> }))
vi.mock('../lifts/LiftSettings', () => ({ LiftSettings: () => <p>Liftformular</p> }))
vi.mock('../inspection-stations/InspectionStationSettings', () => ({ InspectionStationSettings: () => <p>Prüfstellenformular</p> }))
vi.mock('../employees/EmployeesPage', () => ({ EmployeeList: () => <p>Mitarbeiterliste</p> }))

afterEach(() => {
  complete.mockClear()
  answer = true
  asked = false
  canEdit = true
  setupDone = false
  unsavedChanges.mark(UNSAVED, false)
})

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<p>Startseite</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SetupPage (neutral 4)', () => {
  it('starts with the company and goes on step by step – the people last', async () => {
    renderAt('/setup')
    expect(screen.getByText('Firmenformular')).toBeTruthy()

    for (const form of ['Modulformular', 'Feiertagsformular', 'Liftformular', 'Prüfstellenformular', 'Mitarbeiterliste']) {
      fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
      expect(await screen.findByText(form)).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull()
  })

  it('the step stands in the address by its name – back there after "Wer benutzt dieses Gerät?"', async () => {
    renderAt('/setup?step=employees')
    expect(screen.getByText('Mitarbeiterliste')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(await screen.findByText('Prüfstellenformular')).toBeTruthy()
  })

  it('"Fertig" and "Später einrichten" both end it', async () => {
    renderAt('/setup?step=employees')
    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    fireEvent.click(screen.getByRole('button', { name: 'Später einrichten' }))
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2))
  })

  it('a device on "Nur ansehen" can look, not end it – the server would refuse', () => {
    canEdit = false
    renderAt('/setup?step=employees')
    expect(screen.queryByRole('button', { name: 'Fertig' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Später einrichten' })).toBeNull()
  })

  it('done on another device: to the start page', () => {
    setupDone = true
    renderAt('/setup')
    expect(screen.getByText('Startseite')).toBeTruthy()
  })

  it('typed but not saved: asks before the next step – "Weiter bearbeiten" stays', async () => {
    unsavedChanges.mark(UNSAVED, true)
    answer = false
    renderAt('/setup')
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await waitFor(() => expect(asked).toBe(true))
    expect(screen.getByText('Firmenformular')).toBeTruthy()
  })
})
