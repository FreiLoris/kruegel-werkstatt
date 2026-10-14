import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import type { Todo } from './todoApi'
import { TodoBoard } from './TodoBoard'

// fictitious
const people = [{ id: 'r', name: 'Reto', color: '#f5d33a' }, { id: 'e', name: 'Erich', color: '#f59b9b' }] as Employee[]
const todo = (id: string, text: string, assigneeId: string | null) =>
  ({ id, text, assigneeId, doneAt: null, dueDate: null, noteId: null, task: null, shopping: false }) as unknown as Todo

vi.mock('./todoApi', () => ({ useReassignTodo: () => ({ mutate: vi.fn() }) }))
vi.mock('./TodoItem', () => ({
  TodoItem: ({ todo, dragHandle }: { todo: Todo; dragHandle?: unknown }) => (
    <li>
      {dragHandle ? 'mit Griff · ' : ''}
      {todo.text}
    </li>
  ),
}))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ error: vi.fn() }) }))

const renderBoard = (canEdit: boolean) =>
  render(
    <MemoryRouter>
      <TodoBoard todos={[todo('a', 'Altöl entsorgen', null), todo('b', 'Offerte schreiben', 'r')]} people={people} canEdit={canEdit} />
    </MemoryRouter>,
  )

describe('TodoBoard', () => {
  it('has a column for "nicht zugewiesen" first and for every person – also an empty one to drop on', () => {
    renderBoard(true)

    const columns = screen.getAllByRole('region')
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual(['Nicht zugewiesen', 'Reto', 'Erich'])
    within(columns[0]).getByText(/Altöl entsorgen/)
    within(columns[1]).getByText(/Offerte schreiben/)
    within(columns[2]).getByText('Nichts offen')
  })

  it('every to-do has a grip to drag it to someone else', () => {
    renderBoard(true)
    screen.getByText('mit Griff · Offerte schreiben')
  })
})
