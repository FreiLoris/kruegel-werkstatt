import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import type { Employee } from '../employees/employeeApi'
import type { Absence } from './absenceApi'
import { AbsenceDialog } from './AbsenceDialog'

const save = vi.fn()
const createSeries = vi.fn()
const updateSeries = vi.fn()
const deleteSeries = vi.fn()
// fictitious: what the server would make of the series
const plan = { days: ['2026-11-02', '2026-11-03', '2026-11-09'], holidays: [], conflicts: [{ day: '2026-11-05', reason: 'bereits als Ferien eingetragen' }] }

vi.mock('./absenceApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./absenceApi')>()),
  useSaveAbsence: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useDeleteAbsence: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateSeries: () => ({ mutate: createSeries, isPending: false, error: null, reset: vi.fn() }),
  useUpdateSeries: () => ({ mutate: updateSeries, isPending: false, error: null, reset: vi.fn() }),
  useDeleteSeries: () => ({ mutate: deleteSeries, isPending: false }),
  useSeriesPreview: (request: unknown) => ({ data: request ? plan : undefined, error: null }),
}))

// fictitious
const employees = [{ id: 'r', name: 'Reto', color: '#f6d860', active: true }] as unknown as Employee[]

function renderDialog(readOnly = false) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  const onClose = vi.fn()
  render(
    <ToastContext value={toast}>
      <ConfirmContext value={() => Promise.resolve(true)}>
        <AbsenceDialog fresh={{ employeeId: 'r', startDate: '2026-10-12', endDate: '2026-10-12' }} employees={employees} readOnly={readOnly} onClose={onClose} />
      </ConfirmContext>
    </ToastContext>,
  )
  return { toast, onClose }
}

describe('AbsenceDialog', () => {
  it('repeats on chosen weekdays and shows what it makes before saving (FB-33)', async () => {
    renderDialog()
    fireEvent.click(screen.getByLabelText('Fremdarbeit'))
    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: 'Garage Muster AG' } })
    fireEvent.change(screen.getByLabelText(/Von/), { target: { value: '2026-11-02' } })
    fireEvent.change(screen.getByLabelText(/Bis/), { target: { value: '2027-01-29' } })

    fireEvent.click(screen.getByLabelText(/Wiederholen/))
    for (const day of ['Donnerstag', 'Montag', 'Dienstag']) fireEvent.click(screen.getByRole('button', { name: day }))

    expect(screen.getByRole('button', { name: 'Mittwoch' }).getAttribute('aria-pressed')).toBe('false')
    // asked once typing pauses
    expect(await screen.findByText('Erstellt 3 Einträge vom 02.11.2026 bis 09.11.2026')).toBeTruthy()
    expect(screen.getByText('05.11.2026 – bereits als Ferien eingetragen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    // in the order of the week, whatever the order of the clicks
    expect(createSeries.mock.lastCall?.[0]).toMatchObject({
      employeeId: 'r',
      category: 'EXTERNAL_WORK',
      company: 'Garage Muster AG',
      from: '2026-11-02',
      to: '2027-01-29',
      weekdays: ['MONDAY', 'TUESDAY', 'THURSDAY'],
      everyOtherWeek: false,
    })
  })

  it('a day of a series is changed for the day, from it on or all – the dates stay then (FB-33)', () => {
    const absence = {
      id: 'a1',
      version: 3,
      employeeId: 'r',
      category: 'EXTERNAL_WORK',
      company: 'Garage Muster AG',
      note: null,
      startDate: '2026-11-09',
      startsAfternoon: false,
      startTime: null,
      endDate: '2026-11-09',
      endsNoon: false,
      endTime: null,
      seriesId: 's1',
    } as unknown as Absence
    render(
      <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <AbsenceDialog absence={absence} employees={employees} readOnly={false} onClose={vi.fn()} />
        </ConfirmContext>
      </ToastContext>,
    )
    expect(screen.queryByLabelText(/Wiederholen/)).toBeNull()

    fireEvent.click(screen.getByLabelText('ab diesem Tag'))

    expect(screen.getByLabelText<HTMLInputElement>(/Von/).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(updateSeries.mock.lastCall?.[0]).toMatchObject({ id: 'a1', scope: 'FROM_HERE', request: { version: 3, company: 'Garage Muster AG' } })
    expect(screen.getByText('Jeder Tag behält sein Datum.')).toBeTruthy()
  })

  it('deletes the days of the scope chosen (FB-33)', async () => {
    const absence = {
      id: 'a1',
      version: 3,
      employeeId: 'r',
      category: 'SICK',
      company: null,
      note: null,
      startDate: '2026-11-09',
      startsAfternoon: false,
      startTime: null,
      endDate: '2026-11-09',
      endsNoon: false,
      endTime: null,
      seriesId: 's1',
    } as unknown as Absence
    render(
      <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <AbsenceDialog absence={absence} employees={employees} readOnly={false} onClose={vi.fn()} />
        </ConfirmContext>
      </ToastContext>,
    )

    fireEvent.click(screen.getByLabelText('ganze Serie'))
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    await vi.waitFor(() => expect(deleteSeries.mock.lastCall?.[0]).toEqual({ id: 'a1', scope: 'ALL' }))
  })

  it('asks for the company only for external work and sends it', () => {
    renderDialog()
    expect(screen.queryByLabelText(/Firma/)).toBeNull()

    fireEvent.click(screen.getByLabelText('Fremdarbeit'))
    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: ' Garage Muster AG ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(save.mock.lastCall?.[0]).toMatchObject({
      id: undefined,
      request: { employeeId: 'r', category: 'EXTERNAL_WORK', company: 'Garage Muster AG', startDate: '2026-10-12', endDate: '2026-10-12' },
    })
  })

  it('a rule conflict on a new entry keeps the dialog open and shows the server reason', () => {
    const { toast, onClose } = renderDialog()
    save.mockImplementationOnce((_variables, { onError }) =>
      onError(new ApiError({ status: 409, title: 'Nicht möglich', detail: 'Für Reto wurde gerade auf einem anderen Gerät etwas eingetragen.' })),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Für Reto wurde gerade auf einem anderen Gerät etwas eingetragen.')
  })

  it('one day cannot be "from noon" and "until noon" at the same time', () => {
    renderDialog()

    fireEvent.click(screen.getByLabelText('nur bis Mittag'))
    fireEvent.click(screen.getByLabelText('erst ab Mittag'))

    const untilNoon = screen.getByLabelText<HTMLInputElement>('nur bis Mittag')
    expect(untilNoon.disabled).toBe(true)
    expect(untilNoon.checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(save.mock.lastCall?.[0].request).toMatchObject({ startsAfternoon: true, endsNoon: false })
  })

  it('a start after the end moves the end along', () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText(/Von/), { target: { value: '2026-10-20' } })

    expect(screen.getByLabelText<HTMLInputElement>(/Bis/).value).toBe('2026-10-20')
  })

  it('without edit rights it only shows', () => {
    renderDialog(true)

    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull()
    // a disabled fieldset disables everything inside (the property itself stays false)
    expect(screen.getByLabelText('Ferien').matches(':disabled')).toBe(true)
  })
})
