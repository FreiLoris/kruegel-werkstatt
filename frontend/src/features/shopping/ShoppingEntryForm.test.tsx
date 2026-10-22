import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShoppingEntryForm } from './ShoppingEntryForm'

const save = vi.fn()

vi.mock('./shoppingApi', async (original) => ({
  ...(await original<typeof import('./shoppingApi')>()),
  useSaveShoppingItem: () => ({ mutate: save, isPending: false }),
}))
// fictitious team
vi.mock('../employees/employeeApi', () => {
  const team = [
    { id: 'reto', name: 'Reto', selectableForTodos: true },
    { id: 'noser', name: 'Noser', selectableForTodos: false },
  ]
  return { useActiveEmployees: () => ({ data: team }), useAllEmployees: () => ({ data: team }) }
})
vi.mock('../../app/person/useDevicePerson', () => ({ useMyEmployeeId: () => 'reto' }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

describe('ShoppingEntryForm', () => {
  it('six fields, recorded by the person of the device, Enter saves it for the task (FB-19)', () => {
    render(<ShoppingEntryForm taskId="t1" />)

    expect(screen.getAllByRole('textbox').length + screen.getAllByRole('combobox').length).toBe(6)
    // only who may get a to-do can order
    expect(screen.getByRole('combobox', { name: 'Bestellen durch' }).textContent).not.toContain('Noser')

    fireEvent.change(screen.getByRole('textbox', { name: 'Bezeichnung' }), { target: { value: 'Ölfilter' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Bestellen durch' }), { target: { value: 'reto' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Teil erfassen' }))

    expect(save).toHaveBeenCalledWith(
      { id: undefined, request: expect.objectContaining({ description: 'Ölfilter', quantity: 1, recordedById: 'reto', orderById: 'reto', taskId: 't1' }) },
      expect.anything(),
    )
  })

  it('without a description nothing is sent – the field says why', () => {
    save.mockReset()
    render(<ShoppingEntryForm />)

    fireEvent.submit(screen.getByRole('form', { name: 'Teil erfassen' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByText('Was wird gebraucht?')).toBeTruthy()
  })
})
