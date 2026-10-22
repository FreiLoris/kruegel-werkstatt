import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskVehicleLocation } from './VehicleLocationSwitch'

const move = vi.fn()
const toastError = vi.fn()

vi.mock('./taskApi', async (original) => ({
  ...(await original<typeof import('./taskApi')>()),
  useMoveVehicle: () => ({ mutate: move, isPending: false }),
}))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: toastError }) }))

beforeEach(() => {
  move.mockReset()
  toastError.mockReset()
})

describe('TaskVehicleLocation (FB-16)', () => {
  it('one tap moves the car; the chosen one again changes nothing', () => {
    render(<TaskVehicleLocation task={{ id: 't1', vehicleLocation: 'AT_CUSTOMER' }} canEdit />)

    expect(screen.getByRole('button', { name: 'Beim Kunden' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Beim Kunden' }))
    expect(move).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Bei uns' }))
    expect(move).toHaveBeenCalledWith({ id: 't1', location: 'AT_WORKSHOP' }, expect.anything())
  })

  it('says why when it was not saved', () => {
    move.mockImplementation((_variables, { onError }) => onError(new Error('offline')))
    render(<TaskVehicleLocation task={{ id: 't1', vehicleLocation: 'AT_CUSTOMER' }} canEdit />)

    fireEvent.click(screen.getByRole('button', { name: 'Bei uns' }))
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Nicht gespeichert'))
  })

  it('without edit rights only the text', () => {
    render(<TaskVehicleLocation task={{ id: 't1', vehicleLocation: 'AT_WORKSHOP' }} canEdit={false} />)

    expect(screen.getByText('Bei uns')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
