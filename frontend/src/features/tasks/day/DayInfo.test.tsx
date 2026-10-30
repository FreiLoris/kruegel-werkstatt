import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeviceStatus } from '../../../app/person/deviceStatus'
import type { Absence } from '../../absences/absenceApi'
import type { NewAbsence } from '../../absences/AbsenceDialog'
import type { Employee } from '../../employees/employeeApi'
import type { Todo } from '../../todos/todoApi'
import { DayInfo } from './DayInfo'

// fictitious
const reto = { id: 'r', name: 'Reto', color: '#f6d860', active: true } as unknown as Employee
const carina = { id: 'c', name: 'Carina', color: '#9fc8f0', active: true } as unknown as Employee

const absence = (employeeId: string, category: Absence['category'], endsNoon = false) =>
  ({ id: `${employeeId}-${category}`, employeeId, category, company: null, note: null, startDate: '2026-10-13', startsAfternoon: false, endDate: '2026-10-13', endsNoon }) as Absence
const todo = (id: string, text: string, dueDate: string | null) => ({ id, text, dueDate }) as Todo

let device: DeviceStatus
let absences: Absence[]
let todos: Todo[]
const dialog = vi.fn()

// neutral 3: all modules on, as the app was before
vi.mock('../../modules/moduleApi', () => import('../../../test/allModulesOn'))
vi.mock('../../../app/person/useDevicePerson', () => ({
  useDevicePerson: () => device,
  useCanEdit: () => device.kind === 'person',
}))
vi.mock('../../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [reto, carina] }) }))
vi.mock('../../absences/absenceApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../absences/absenceApi')>()),
  useAbsences: () => ({ data: absences }),
}))
vi.mock('../../todos/todoApi', () => ({ useTodos: () => ({ data: todos }) }))
vi.mock('../../reminders/ToCallList', () => ({ ToCallList: () => null }))
vi.mock('../../todos/TodoItem', () => ({ TodoItem: ({ todo: t }: { todo: Todo }) => <li>{t.text}</li> }))
vi.mock('../../absences/AbsenceDialog', () => ({
  AbsenceDialog: (props: { fresh?: NewAbsence; absence?: Absence }) => {
    dialog(props)
    return <p>Dialog</p>
  },
}))

beforeEach(() => {
  device = { kind: 'person', person: carina }
  absences = []
  todos = []
  dialog.mockClear()
})

describe('DayInfo', () => {
  it('shows who is away and who is in, with the half day', () => {
    absences = [absence('r', 'VACATION'), absence('c', 'PRESENT', true)]
    render(<DayInfo date="2026-10-13" />)

    expect(screen.getByRole('button', { name: 'Reto: Eintrag öffnen' }).textContent).toBe('Reto · Ferien')
    expect(screen.getByRole('button', { name: 'Carina: Eintrag öffnen' }).textContent).toBe('Carina · Anwesend (Vormittag)')
  })

  it('shows only the to-dos due on this day', () => {
    todos = [todo('1', 'Holzböden abholen', '2026-10-13'), todo('2', 'Morgen', '2026-10-14'), todo('3', 'Irgendwann', null)]
    render(<DayInfo date="2026-10-13" />)

    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Holzböden abholen'])
  })

  it('"Anwesend" presets the person of the device, this day and the category', () => {
    render(<DayInfo date="2026-10-13" />)

    fireEvent.click(screen.getByRole('button', { name: 'Anwesend' }))

    expect(dialog.mock.lastCall?.[0].fresh).toEqual({ employeeId: 'c', startDate: '2026-10-13', endDate: '2026-10-13', category: 'PRESENT' })
  })

  it('a view-only device sees the day but cannot enter anything – and nothing at all on an empty day', () => {
    device = { kind: 'viewOnly' }
    const { container, rerender } = render(<DayInfo date="2026-10-13" />)
    expect(container.innerHTML).toBe('')

    absences = [absence('r', 'SICK')]
    rerender(<DayInfo date="2026-10-13" />)
    expect(screen.getByText('Reto')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Anwesend' })).toBeNull()
  })
})
