import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnyTask } from '../tasks/taskApi'
import { WithoutAppointment } from './WithoutAppointment'

// fictitious
const order = (id: string, displayName: string) => ({ id, customer: { displayName } }) as unknown as AnyTask

let tasks: AnyTask[] | undefined
let waiting: AnyTask[] = []

vi.mock('../tasks/taskApi', () => ({
  useTasksWithoutAppointment: () => ({ data: tasks }),
  useTasksWaitingForParts: () => ({ data: waiting }),
}))
vi.mock('../shopping/shoppingApi', () => ({ useTasksShoppingItems: () => ({ data: [], error: null }) }))

const renderLine = () =>
  render(
    <MemoryRouter>
      <WithoutAppointment />
    </MemoryRouter>,
  )

beforeEach(() => {
  waiting = []
})

describe('WithoutAppointment', () => {
  it('says how many orders wait and whose, and leads to their list', () => {
    tasks = [order('1', 'Huber Peter'), order('2', 'Muster Transport AG')]
    renderLine()

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/tasks?view=unplanned')
    expect(link.textContent).toBe('2 ohne Termin · Huber Peter · Muster Transport AG')
  })

  it('counts the orders waiting for parts separately (FB-15)', () => {
    tasks = [order('1', 'Huber Peter')]
    waiting = [{ ...order('2', 'Meier Anna'), status: 'WAITING_FOR_PARTS', date: '2026-10-12' } as unknown as AnyTask]
    renderLine()

    expect(screen.getByRole('link').textContent).toBe('1 ohne Termin · 1 wartet auf Material · Meier Anna · Huber Peter')
  })

  it('shows nothing when everything is planned or still loading', () => {
    tasks = []
    expect(renderLine().container.innerHTML).toBe('')
    tasks = undefined
    expect(renderLine().container.innerHTML).toBe('')
  })
})
