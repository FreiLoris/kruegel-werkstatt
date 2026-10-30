import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_APPOINTMENT, type AppointmentForm } from './appointmentForm'
import { AppointmentStep } from './AppointmentStep'
import { modulesOff } from '../../../test/allModulesOn'

// fictitious
// neutral 3: all modules on, as the app was before
vi.mock('../../modules/moduleApi', () => import('../../../test/allModulesOn'))
vi.mock('../../employees/employeeApi', () => ({ useActiveEmployees: () => ({ data: [] }) }))
vi.mock('../../lifts/liftApi', () => ({ useAllLifts: () => ({ data: [] }) }))
vi.mock('../../inspection-stations/inspectionStationApi', () => ({ useInspectionStations: () => ({ data: [] }) }))
vi.mock('../../insurances/insuranceApi', () => ({
  useInsurances: () => ({
    data: [
      { id: 'muster', name: 'Muster Versicherung', active: true },
      { id: 'alt', name: 'Alte Versicherung', active: false },
    ],
  }),
}))
vi.mock('../../service-items/serviceItemApi', () => ({
  useAllServiceItems: () => ({
    data: [
      { id: 'oil', name: 'Ölwechsel', active: true },
      { id: 'brake', name: 'Bremsflüssigkeit', active: true },
    ],
  }),
}))
// the week overview loads tasks – not what is tested here
vi.mock('../../tire-hotel/tireHotelApi', async (original) => ({
  ...(await original<typeof import('../../tire-hotel/tireHotelApi')>()),
  // fictitious: the car's summer tyres are on it
  useVehicleTireSets: () => ({ data: [{ state: 'MOUNTED', dimension: '205/55 R16 91H' }] }),
}))
vi.mock('./CapacityOverview', () => ({ CapacityOverview: () => null }))
vi.mock('./SameVehicleHint', () => ({ SameVehicleHint: () => null }))
vi.mock('./useAppointmentWarnings', () => ({ useAppointmentWarnings: () => [] }))

const THURSDAY: AppointmentForm = { ...EMPTY_APPOINTMENT, acceptedById: 'r', date: '2026-10-15', time: '08:00', endDate: '2026-10-15', endTime: '09:00' }

/** The step with real state around it, as in the wizard; `seen.form` is always the latest form */
function renderStep(initial: AppointmentForm = THURSDAY, showRequired = false) {
  const changed = vi.fn<(form: AppointmentForm) => void>()
  function Harness() {
    const [form, setForm] = useState(initial)
    return (
      <AppointmentStep
        value={form}
        onChange={(next) => {
          changed(next)
          setForm(next)
        }}
        holidays={new Map()}
        showRequired={showRequired}
      />
    )
  }
  render(<Harness />)
  return {
    get form() {
      return changed.mock.lastCall?.[0] ?? initial
    },
  }
}

const tick = (name: string) => screen.getByRole<HTMLInputElement>('checkbox', { name })

describe('AppointmentStep – Service', () => {
  it('shows the service items only after "Service" is ticked', () => {
    const seen = renderStep()
    expect(screen.queryByRole('checkbox', { name: 'Ölwechsel' })).toBeNull()

    fireEvent.click(tick('Service'))
    fireEvent.click(tick('Ölwechsel'))

    expect(seen.form).toMatchObject({ service: true, serviceItemIds: ['oil'] })
  })

  it('unticking "Service" hides the items and forgets them', () => {
    const seen = renderStep({ ...THURSDAY, service: true, serviceItemIds: ['oil'] })

    fireEvent.click(tick('Service'))

    expect(screen.queryByRole('checkbox', { name: 'Ölwechsel' })).toBeNull()
    expect(seen.form.serviceItemIds).toEqual([])
  })

  it('says that an item is missing only after trying to continue', () => {
    renderStep({ ...THURSDAY, service: true }, true)

    expect(screen.getByText(/Mindestens eine Leistung wählen/)).toBeTruthy()
  })
})

describe('AppointmentStep – Versicherungsfall', () => {
  const choices = () => screen.getAllByRole<HTMLOptionElement>('option').filter((o) => o.closest('select')?.labels?.[0]?.textContent?.startsWith('Versicherung'))

  it('ticking asks for the insurance (only ones in use) and the claim number', () => {
    const step = renderStep()
    expect(screen.queryByRole('textbox', { name: /^Schadennummer/ })).toBeNull()

    fireEvent.click(tick('Versicherungsfall – Versicherung und Schadennummer kommen auf den Auftragszettel'))

    expect(choices().map((o) => o.textContent)).toEqual(['Bitte wählen …', 'Muster Versicherung'])
    fireEvent.change(screen.getByRole('textbox', { name: /^Schadennummer/ }), { target: { value: 'S-42' } })
    expect(step.form).toMatchObject({ insuranceCase: true, claimNumber: 'S-42' })
  })

  it('editing: the insurance of the task stays choosable although it is no longer used', () => {
    renderStep({ ...THURSDAY, insuranceCase: true, insuranceId: 'alt' })

    expect(choices().map((o) => o.textContent)).toEqual(['Bitte wählen …', 'Muster Versicherung', 'Alte Versicherung (nicht mehr verwendet)'])
  })

  it('says that the insurance is missing only after trying to continue', () => {
    renderStep({ ...THURSDAY, insuranceCase: true }, true)

    expect(screen.getByText('Versicherung wählen – oder «Versicherungsfall» abwählen')).toBeTruthy()
  })
})

describe('AppointmentStep – Neue Reifen (FB-25)', () => {
  it('proposes the dimension of the tyres on the car and orders four – both changeable', () => {
    const seen = renderStep({ ...THURSDAY, tireChange: true })
    fireEvent.change(screen.getByLabelText('Art'), { target: { value: 'NEW_TIRES' } })

    expect(seen.form).toMatchObject({ tireChangeKind: 'NEW_TIRES', newTiresDimension: '205/55 R16 91H', newTiresCount: '4' })
    fireEvent.change(screen.getByLabelText('Reifendimension'), { target: { value: '225/45 R17' } })
    fireEvent.change(screen.getByLabelText('Anzahl'), { target: { value: '2' } })
    expect(seen.form).toMatchObject({ newTiresDimension: '225/45 R17', newTiresCount: '2' })
  })

  it('a dimension already typed is kept when the kind is chosen again', () => {
    const seen = renderStep({ ...THURSDAY, tireChange: true, newTiresDimension: '195/65 R15' })
    fireEvent.change(screen.getByLabelText('Art'), { target: { value: 'NEW_TIRES' } })
    expect(seen.form.newTiresDimension).toBe('195/65 R15')
  })
})

describe('AppointmentStep – modules switched off (neutral 3)', () => {
  afterEach(() => modulesOff.clear())

  it('without the tyre hotel nothing can be stored, without MFK there is no MFK', () => {
    modulesOff.add('TIRE_HOTEL')
    modulesOff.add('MFK')
    renderStep({ ...THURSDAY, tireChange: true })

    const kinds = screen.getAllByRole('option').map((option) => option.textContent)
    expect(kinds.some((kind) => /eingelagert/i.test(kind ?? ''))).toBe(false)
    expect(screen.queryByRole('checkbox', { name: 'MFK' })).toBeNull()
  })

  it('a task that already has an MFK keeps it', () => {
    modulesOff.add('MFK')
    renderStep({ ...THURSDAY, mfk: true })
    expect(tick('MFK').checked).toBe(true)
  })
})
