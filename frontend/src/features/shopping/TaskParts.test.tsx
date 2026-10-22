import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ShoppingItem } from './shoppingApi'
import { TaskParts } from './TaskParts'

let items: ShoppingItem[] = []

vi.mock('./shoppingApi', async (original) => ({
  ...(await original<typeof import('./shoppingApi')>()),
  useTaskShoppingItems: () => ({ data: items }),
}))
vi.mock('./ShoppingTable', () => ({ ShoppingTable: ({ items: shown }: { items: ShoppingItem[] }) => <p>{shown.length} Teile</p> }))
vi.mock('./ShoppingEntryForm', () => ({ ShoppingEntryForm: ({ taskId }: { taskId: string }) => <p>Erfassen für {taskId}</p> }))

const renderParts = (canEdit: boolean) =>
  render(
    <MemoryRouter>
      <TaskParts taskId="t1" canEdit={canEdit} />
    </MemoryRouter>,
  )

// fictitious
const part = (status: ShoppingItem['status']) => ({ id: status, description: 'Teil', status }) as ShoppingItem

describe('TaskParts (FB-19)', () => {
  it('the quick entry right on the task, linked to it', () => {
    items = []
    renderParts(true)

    expect(screen.getByText('Keine Teile bestellt.')).toBeTruthy()
    expect(screen.getByText('Erfassen für t1')).toBeTruthy()
  })

  it('says when all parts arrived – it can be planned', () => {
    items = [part('ARRIVED'), part('ARRIVED')]
    const { unmount } = renderParts(false)
    expect(screen.getByText('✓ Alle Teile geliefert')).toBeTruthy()
    // read only: no entry
    expect(screen.queryByText(/Erfassen/)).toBeNull()
    unmount()

    items = [part('ARRIVED'), part('ORDERED')]
    renderParts(false)
    expect(screen.queryByText('✓ Alle Teile geliefert')).toBeNull()
  })
})
