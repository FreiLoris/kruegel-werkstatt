import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import type { Todo } from './todoApi'
import { TodoItem } from './TodoItem'

const setDone = vi.fn()
const remove = vi.fn()

vi.mock('./todoApi', () => ({
  useSetTodoDone: () => ({ mutate: setDone, isPending: false }),
  useDeleteTodo: () => ({ mutate: remove, isPending: false }),
  useSaveTodo: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../employees/employeeApi', () => ({
  useAllEmployees: () => ({ data: [{ id: 'r', name: 'Reto', color: '#f6d860' }] }),
  useActiveEmployees: () => ({ data: [] }),
}))

// fictitious
const todo = {
  id: 't1',
  version: 0,
  text: 'Kunde anrufen',
  assigneeId: null,
  dueDate: '2000-01-01',
  shopping: false,
  task: null,
  doneAt: null,
  doneBy: null,
} as unknown as Todo

function renderItem(confirmAnswer: boolean, item: Todo = todo) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  render(
    <MemoryRouter>
      <ToastContext value={toast}>
        <ConfirmContext value={() => Promise.resolve(confirmAnswer)}>
          <ul>
            <TodoItem todo={item} canEdit />
          </ul>
        </ConfirmContext>
      </ToastContext>
    </MemoryRouter>,
  )
}

describe('TodoItem', () => {
  beforeEach(() => {
    setDone.mockReset()
    remove.mockReset()
  })

  it('ticks off only with the checkbox – a click on the text does nothing (F5)', () => {
    renderItem(true)

    fireEvent.click(screen.getByText('Kunde anrufen'))
    expect(setDone).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', { name: '«Kunde anrufen» erledigt' }))
    expect(setDone).toHaveBeenCalledWith({ id: 't1', done: true }, expect.anything())
  })

  it('says it is not assigned and since when it is overdue', () => {
    renderItem(true)

    expect(screen.getByText('nicht zugewiesen')).toBeTruthy()
    expect(screen.getByText('überfällig seit 01.01.2000')).toBeTruthy()
  })

  it('deletes only after asking – "no" keeps it', async () => {
    renderItem(false)
    fireEvent.click(screen.getByRole('button', { name: '«Kunde anrufen» löschen' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(remove).not.toHaveBeenCalled()
  })

  it('deletes after "yes"', async () => {
    renderItem(true)
    fireEvent.click(screen.getByRole('button', { name: '«Kunde anrufen» löschen' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('t1', expect.anything()))
  })

  it('a done one shows who and offers undo', () => {
    renderItem(true, { ...todo, doneAt: '2026-10-15T06:00:00Z', doneBy: 'r' })

    expect(screen.getByText(/erledigt von Reto/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }))
    expect(setDone).toHaveBeenCalledWith({ id: 't1', done: false }, expect.anything())
  })
})
