import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnyTask } from '../taskApi'
import { UnplannedView } from './UnplannedView'

// fictitious
const waiting = {
  id: 't1',
  taskNumber: '26-0007',
  status: 'WAITING_FOR_PARTS',
  date: null,
  time: null,
  endAt: null,
  customer: { displayName: 'Muster Transport AG' },
  vehicle: { licensePlate: 'ZH 900 003', description: 'Skoda Octavia' },
  mechanicId: 'm1',
  tireChange: false,
  tireChangeKind: null,
  mfk: false,
  mfkAppointment: null,
  serviceItemIds: [],
  parts: { description: 'Kupplungssatz', status: 'TO_ORDER', supplier: null, orderedOn: null },
  workDescription: 'Kupplung ersetzen',
  createdAt: '2026-10-09T08:15:00Z',
} as unknown as AnyTask

let tasks: AnyTask[]
let canEdit: boolean

vi.mock('../taskApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../taskApi')>()),
  useTasksWithoutAppointment: () => ({ data: tasks }),
}))
vi.mock('../../../app/person/useDevicePerson', () => ({ useCanEdit: () => canEdit }))
vi.mock('../../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [{ id: 'm1', name: 'Döme', color: '#9fdfaa' }] }) }))
vi.mock('../../service-items/serviceItemApi', () => ({ useAllServiceItems: () => ({ data: [] }) }))

const renderView = () =>
  render(
    <MemoryRouter>
      <UnplannedView />
    </MemoryRouter>,
  )

beforeEach(() => {
  tasks = [waiting]
  canEdit = true
})

describe('UnplannedView', () => {
  it('names the order so it is not forgotten: number, customer, vehicle, work, parts, mechanic', () => {
    renderView()

    expect(screen.getByRole('link', { name: 'Muster Transport AG' }).getAttribute('href')).toBe('/tasks/t1')
    expect(screen.getByText('26-0007')).toBeTruthy()
    expect(screen.getByText('Skoda Octavia')).toBeTruthy()
    expect(screen.getByText(/Kupplung ersetzen/)).toBeTruthy()
    expect(screen.getByText('Material: Zum bestellen')).toBeTruthy()
    expect(screen.getByText('Döme')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Einplanen' })).toBeTruthy()
  })

  it('says so when everything is planned, and offers no planning without edit rights', () => {
    canEdit = false
    const first = renderView()
    expect(screen.queryByRole('button', { name: 'Einplanen' })).toBeNull()
    first.unmount()

    tasks = []
    renderView()
    expect(screen.getByText(/alles ist eingeplant/)).toBeTruthy()
  })
})
