import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { BoardOverview } from './BoardOverview'

// fictitious
const employees = [
  { id: 'r', name: 'Reto', color: '#f6d860', active: true, hasPinboardColumn: true },
  { id: 'e', name: 'Erich', color: '#ff9f9f', active: true, hasPinboardColumn: true },
]
const todo = (id: string, text: string, dueDate: string | null = null) => ({ id, text, dueDate, assigneeId: 'r', noteId: null, doneAt: null })
const todos = [
  todo('t1', 'Reifen bestellen', '2026-01-05'),
  ...Array.from({ length: 6 }, (_, i) => todo(`x${i}`, `Aufgabe ${i}`)),
]
const notes = [{ id: 'n1', text: 'Kunde ruft zurück', assigneeIds: ['r'], todoCount: 3, todoDoneCount: 1 }]

vi.mock('../notes/noteApi', () => ({ BOARD: {}, useNotes: () => ({ data: notes, error: null }) }))
vi.mock('../todos/todoApi', () => ({ BOARD_TODOS: {}, useTodos: () => ({ data: todos, error: null }) }))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: employees }) }))

function renderBoard() {
  render(
    <MemoryRouter>
      <BoardOverview />
    </MemoryRouter>,
  )
}

describe('BoardOverview', () => {
  it('nothing can be ticked off – no checkbox, no button (F5)', () => {
    renderBoard()

    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('overdue to-dos first and with their date; the rest as "+ n weitere"', () => {
    renderBoard()
    const reto = screen.getByRole('region', { name: 'Reto' })

    expect(reto.querySelector('li')?.textContent).toContain('Kunde ruft zurück')
    expect(screen.getByText(/überfällig seit 05\.01\.2026/)).toBeTruthy()
    // 7 to-dos, 5 shown
    expect(screen.getByRole('link', { name: /\+ 2 weitere/ })).toBeTruthy()
    expect(screen.getByLabelText('1 von 3 Aufgaben erledigt')).toBeTruthy()
  })

  it('every person has a column, "Neu" only when something waits there', () => {
    renderBoard()

    expect(screen.getByRole('region', { name: 'Erich' }).textContent).toContain('nichts offen')
    expect(screen.queryByRole('region', { name: 'Neu' })).toBeNull()
  })
})
