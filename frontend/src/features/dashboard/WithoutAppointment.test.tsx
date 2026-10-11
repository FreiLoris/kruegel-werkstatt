import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AnyTask } from '../tasks/taskApi'
import { WithoutAppointment } from './WithoutAppointment'

// fictitious
const order = (id: string, displayName: string) => ({ id, customer: { displayName } }) as unknown as AnyTask

let tasks: AnyTask[] | undefined

vi.mock('../tasks/taskApi', () => ({ useTasksWithoutAppointment: () => ({ data: tasks }) }))

const renderLine = () =>
  render(
    <MemoryRouter>
      <WithoutAppointment />
    </MemoryRouter>,
  )

describe('WithoutAppointment', () => {
  it('says how many orders wait and whose, and leads to their list', () => {
    tasks = [order('1', 'Huber Peter'), order('2', 'Muster Transport AG')]
    renderLine()

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/tasks?view=unplanned')
    expect(link.textContent).toBe('2 ohne Termin· Huber Peter · Muster Transport AG')
  })

  it('shows nothing when everything is planned or still loading', () => {
    tasks = []
    expect(renderLine().container.innerHTML).toBe('')
    tasks = undefined
    expect(renderLine().container.innerHTML).toBe('')
  })
})
