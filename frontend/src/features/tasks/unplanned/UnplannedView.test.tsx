import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShoppingItem } from '../../shopping/shoppingApi'
import type { AnyTask } from '../taskApi'
import { UnplannedView } from './UnplannedView'

// fictitious
const waiting = {
  id: 't1',
  taskNumber: '26-0007',
  status: 'WAITING_FOR_PARTS',
  vehicleLocation: 'AT_CUSTOMER',
  date: null,
  time: null,
  endAt: null,
  customer: { displayName: 'Muster Transport AG', phone: '052 000 00 00', mobile: null },
  vehicle: { licensePlate: 'ZH 900 003', description: 'Skoda Octavia' },
  mechanicId: 'm1',
  tireChange: false,
  tireChangeKind: null,
  mfk: false,
  mfkAppointment: null,
  serviceItemIds: [],
  workDescription: 'Kupplung ersetzen',
  createdAt: '2026-10-09T08:15:00Z',
} as unknown as AnyTask

let tasks: AnyTask[]
let waitingSinceTheirDay: AnyTask[]
let canEdit: boolean

vi.mock('../taskApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../taskApi')>()),
  useTasksWithoutAppointment: () => ({ data: tasks }),
  useTasksWaitingForParts: () => ({ data: waitingSinceTheirDay }),
}))
// the parts of the tasks on the shopping list (FB-19)
let parts: ShoppingItem[] = []
const part = (taskId: string, description: string, status: ShoppingItem['status']) => ({ description, quantity: 1, status, task: { id: taskId } }) as ShoppingItem
vi.mock('../../shopping/shoppingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shopping/shoppingApi')>()),
  useTasksShoppingItems: () => ({ data: parts, error: null }),
}))
vi.mock('../../customer-calls/customerCallApi', async (original) => ({
  ...(await original<typeof import('../../customer-calls/customerCallApi')>()),
  useLatestCalls: () => ({ data: new Map() }),
  useNoteCall: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCall: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../customer-calls/CallLog', () => ({ CallLog: () => <span>Anrufliste</span> }))
vi.mock('../VehicleLocationSwitch', () => ({ TaskVehicleLocation: ({ task }: { task: AnyTask }) => <span>Standort {task.vehicleLocation}</span> }))
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
  parts = [part('t1', 'Kupplungssatz', 'TO_ORDER')]
  tasks = [waiting]
  waitingSinceTheirDay = []
  canEdit = true
})

describe('UnplannedView', () => {
  it('names the order so it is not forgotten: number, customer, vehicle, work, parts, mechanic', () => {
    renderView()

    expect(screen.getByRole('link', { name: 'Muster Transport AG' }).getAttribute('href')).toBe('/tasks/t1')
    expect(screen.getByText('26-0007')).toBeTruthy()
    expect(screen.getByText('Skoda Octavia')).toBeTruthy()
    expect(screen.getByText(/Kupplung ersetzen/)).toBeTruthy()
    expect(screen.getByText('Fehlt: Kupplungssatz')).toBeTruthy()
    expect(screen.getByText('Döme')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Einplanen' })).toBeTruthy()
  })

  it('waiting for parts in a group of their own – also still on a day that is over, with what is missing (FB-15)', () => {
    const open = { ...waiting, id: 't2', status: 'RECEIVED', customer: { displayName: 'Huber Peter' } } as unknown as AnyTask
    const dayOver = {
      ...waiting,
      id: 't3',
      date: '2026-10-12',
      customer: { displayName: 'Meier Anna' },
    } as unknown as AnyTask
    tasks = [waiting, open]
    waitingSinceTheirDay = [dayOver]
    parts = [part('t1', 'Kupplungssatz', 'TO_ORDER'), part('t3', 'Bremsscheiben vorne', 'ARRIVED')]
    renderView()

    const waitingList = screen.getByRole('list', { name: 'Aufträge, die auf Material warten' })
    // the parts arrived first – it can be planned now
    expect([...waitingList.querySelectorAll('li')].map((li) => li.querySelector('a')?.textContent)).toEqual(['Meier Anna', 'Muster Transport AG'])
    expect(screen.getByText('✓ Alle Teile geliefert – jetzt einplanen')).toBeTruthy()
    expect(screen.getByText('Termin war 12.10.2026')).toBeTruthy()
    expect(screen.getByText('Fehlt: Kupplungssatz')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Aufträge ohne Termin' }).textContent).toContain('Huber Peter')
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

  it('where the vehicle is: filtered, the number to call, "Jetzt aufbieten" when nothing is missing (FB-16)', () => {
    const here = { ...waiting, id: 't2', status: 'RECEIVED', vehicleLocation: 'AT_WORKSHOP', customer: { displayName: 'Huber Peter', phone: null, mobile: null } } as unknown as AnyTask
    const ready = { ...waiting, id: 't3', date: '2026-10-12', customer: { displayName: 'Meier Anna', phone: null, mobile: '079 000 00 00' } } as unknown as AnyTask
    tasks = [waiting, here]
    waitingSinceTheirDay = [ready]
    parts = [part('t1', 'Kupplungssatz', 'TO_ORDER'), part('t3', 'Bremsscheiben vorne', 'ARRIVED')]
    render(
      <MemoryRouter initialEntries={['/tasks?view=unplanned&where=customer']}>
        <UnplannedView />
      </MemoryRouter>,
    )

    // with the customer only: Huber's car is here
    expect(screen.queryByText('Huber Peter')).toBeNull()
    expect(screen.getByRole('button', { name: 'Beim Kunden – aufbieten (2)' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('link', { name: /052 000 00 00/ }).getAttribute('href')).toBe('tel:0520000000')
    // parts arrived, car with the customer: call in now – the one still missing parts not
    expect(screen.getAllByText('Jetzt aufbieten')).toHaveLength(1)
    expect(screen.getByText('Jetzt aufbieten').closest('li')?.textContent).toContain('Meier Anna')
  })
})
