import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_APPOINTMENT, type AppointmentForm } from './appointmentForm'
import { AppointmentStep } from './AppointmentStep'

// fictitious
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
