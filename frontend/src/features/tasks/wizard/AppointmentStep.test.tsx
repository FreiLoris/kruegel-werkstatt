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

describe('AppointmentStep – Material bestellen', () => {
  it('ticking opens the window; closing it leaves the task without material', () => {
    const seen = renderStep()

    fireEvent.click(tick('Material bestellen'))
    expect(screen.getByRole('textbox', { name: /^Was/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(seen.form.parts).toBe(false)
    expect(tick('Material bestellen').checked).toBe(false)
    expect(screen.queryByRole('textbox', { name: /^Was/ })).toBeNull()
  })

  it('"Übernehmen" puts the order into the task and shows it in one line', () => {
    const seen = renderStep()

    fireEvent.click(tick('Material bestellen'))
    fireEvent.change(screen.getByRole('textbox', { name: /^Was/ }), { target: { value: ' Bremsscheiben vorne ' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Lieferant' }), { target: { value: 'Derendinger' } })
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))

    expect(seen.form).toMatchObject({ parts: true, partsDescription: 'Bremsscheiben vorne', partsSupplier: 'Derendinger', partsStatus: 'TO_ORDER' })
    expect(tick('Material bestellen').checked).toBe(true)
    expect(screen.getByText('Bremsscheiben vorne')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /^Was/ })).toBeNull()
  })

  it('"Ändern" opens the window with what is there; unticking removes the order', () => {
    const seen = renderStep({ ...THURSDAY, parts: true, partsDescription: 'Bremsscheiben', partsStatus: 'ORDERED' })

    fireEvent.click(screen.getByRole('button', { name: 'Ändern' }))
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /^Was/ }).value).toBe('Bremsscheiben')
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    fireEvent.click(tick('Material bestellen'))

    expect(seen.form.parts).toBe(false)
  })

  it('does not take over an order without "Was" – the window stays open', () => {
    const seen = renderStep()

    fireEvent.click(tick('Material bestellen'))
    // empty: the browser itself stops the required field (as in every other dialog)
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(seen.form.parts).toBe(false)
    expect(screen.getByRole('textbox', { name: /^Was/ })).toBeTruthy()

    // only blanks get past the browser – then the dialog says it
    fireEvent.change(screen.getByRole('textbox', { name: /^Was/ }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))
    expect(screen.getByText('Was muss bestellt werden?')).toBeTruthy()
    expect(seen.form.parts).toBe(false)
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
