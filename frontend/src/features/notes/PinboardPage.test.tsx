import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PinboardPage } from './PinboardPage'

vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('./noteApi', () => ({
  BOARD: {},
  useNotes: () => ({ data: [], error: null }),
  useMoveNote: () => ({ mutate: vi.fn() }),
  useSaveNote: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('./NoteDialog', () => ({ NoteDialogById: ({ id }: { id: string }) => <p>Notiz {id}</p> }))

function Where() {
  const { pathname, search } = useLocation()
  return <p>Seite {pathname + search}</p>
}

const renderAt = (address: string) =>
  render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path="/pinboard" element={<PinboardPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )

describe('PinboardPage', () => {
  it('forwards the old views to the pages of their own (FB-04), with the person', () => {
    renderAt('/pinboard?view=list&person=r')
    screen.getByText('Seite /todos?person=r')
  })

  it('forwards the old shopping list view', () => {
    renderAt('/pinboard?view=shopping')
    screen.getByText('Seite /shopping')
  })

  it('shows the board with only "+ Notiz" – to-dos are added on their page', () => {
    renderAt('/pinboard')

    expect(screen.getByRole('button', { name: /Offen/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: 'To-do' })).toBeNull()
  })

  it('"Erledigt" (and the old "Archiv" address) shows the archived notes', () => {
    renderAt('/pinboard?view=archive')

    expect(screen.getByRole('button', { name: 'Erledigt' }).getAttribute('aria-pressed')).toBe('true')
    screen.getByLabelText('In erledigten Notizen suchen')
  })

  it('opens a note by address – the link from its to-do', () => {
    renderAt('/pinboard?note=n1')
    screen.getByText('Notiz n1')
  })
})
