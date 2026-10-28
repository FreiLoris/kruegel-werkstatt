import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmContext } from '../../components/ui/confirmContext'
import type { Employee } from '../../features/employees/employeeApi'
import { PersonMenu } from './PersonMenu'

const choose = vi.fn()
// the test browser knows no popover – the menu closes itself with it
HTMLElement.prototype.hidePopover ??= () => undefined
vi.mock('../../lib/devicePerson', () => ({ choose: (choice: unknown) => choose(choice) }))

// fictitious
const team = [
  { id: 'reto', name: 'Reto' },
  { id: 'mora', name: 'Mora' },
] as Employee[]

const renderMenu = (confirmed: boolean) =>
  render(
    <ConfirmContext value={() => Promise.resolve(confirmed)}>
      <PersonMenu status={{ kind: 'person', person: team[0] } as never} active={team} />
    </ConfirmContext>,
  )

describe('PersonMenu (FB-29)', () => {
  it('lists the others – one click switches', () => {
    renderMenu(true)

    expect(screen.queryByRole('menuitem', { name: 'Reto' })).toBeNull()
    fireEvent.click(screen.getByText('Mora'))

    expect(choose).toHaveBeenLastCalledWith({ kind: 'person', id: 'mora' })
  })

  it('"Nur ansehen" only after asking – a mis-tap takes nothing away', async () => {
    choose.mockClear()
    renderMenu(false)

    fireEvent.click(screen.getByText(/Nur ansehen/))
    await Promise.resolve()

    expect(choose).not.toHaveBeenCalled()
  })
})
