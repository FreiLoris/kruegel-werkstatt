import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AnyTask } from '../taskApi'
import { SameVehicleHint } from './SameVehicleHint'

// fictitious
const planned = {
  id: 'p',
  taskNumber: '26-0010',
  vehicle: { id: 'golf' },
  status: 'RECEIVED',
  date: '2026-10-14',
  time: '13:30',
  endAt: '2026-10-14T14:00:00',
  timeOpen: false,
  liftId: 'l2',
} as unknown as AnyTask
const unplanned = { ...planned, id: 'u', taskNumber: '26-0013', date: null, time: null, endAt: null, liftId: null } as unknown as AnyTask
const dayAsked = vi.fn()

vi.mock('../taskApi', () => ({
  useTasksOfDay: (date: string | undefined) => {
    dayAsked(date)
    return { data: date ? [planned] : undefined }
  },
  useTasksWithoutAppointment: () => ({ data: [unplanned] }),
}))
vi.mock('../../lifts/liftApi', () => ({ useAllLifts: () => ({ data: [{ id: 'l2', name: 'Lift 2' }] }) }))

const renderHint = (props: Parameters<typeof SameVehicleHint>[0]) =>
  render(
    <MemoryRouter>
      <SameVehicleHint {...props} />
    </MemoryRouter>,
  )

describe('SameVehicleHint', () => {
  it('names the open tasks of the car on the day and without appointment, with a link each', () => {
    renderHint({ vehicleId: 'golf', date: '2026-10-14' })

    expect(screen.getByRole('status').textContent).toContain('schon einen offenen Auftrag')
    expect(screen.getByRole('status').textContent).toContain('26-0010 · 14.10.2026 · 13:30–14:00 · Lift 2')
    expect(screen.getByRole('status').textContent).toContain('26-0013 · ohne Termin')
    expect(screen.getByRole('link', { name: '26-0010' }).getAttribute('href')).toBe('/tasks/p')
  })

  it('without a day only the list "Ohne Termin" counts', () => {
    renderHint({ vehicleId: 'golf', date: '' })

    expect(dayAsked).toHaveBeenLastCalledWith(undefined)
    expect(screen.queryByRole('link', { name: '26-0010' })).toBeNull()
    screen.getByRole('link', { name: '26-0013' })
  })

  it('says nothing about another car or about the task being edited', () => {
    const { container, rerender } = renderHint({ vehicleId: 'polo', date: '2026-10-14' })
    expect(container.innerHTML).toBe('')

    rerender(
      <MemoryRouter>
        <SameVehicleHint vehicleId="golf" date="" taskId="u" />
      </MemoryRouter>,
    )
    expect(container.innerHTML).toBe('')
  })
})
