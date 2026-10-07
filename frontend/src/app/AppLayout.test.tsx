import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'
import type { DeviceStatus } from './person/deviceStatus'

let device: DeviceStatus = { kind: 'viewOnly' }

vi.mock('./live/useLiveUpdates', () => ({ useLiveUpdates: () => 'connected' }))
vi.mock('./person/useDevicePerson', () => ({ useDevicePerson: () => device, useCanEdit: () => false }))
vi.mock('./person/PersonMenu', () => ({ PersonMenu: () => null }))
vi.mock('../features/employees/employeeApi', () => ({ useActiveEmployees: () => ({ data: [] }) }))
vi.mock('../features/company/companyApi', () => ({ useCompany: () => ({ data: { name: 'Testgarage', logoUrl: null } }) }))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <p>Dashboard</p> },
          { path: 'tasks', element: <p>Termine-Seite</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('AppLayout', () => {
  it('the TV shows the dashboard full screen: no header, navigation at the bottom', () => {
    device = { kind: 'viewOnly' }
    renderAt('/')

    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Live')
  })

  it('on the TV every other page keeps the header', () => {
    device = { kind: 'viewOnly' }
    renderAt('/tasks')

    expect(screen.getByRole('banner')).toBeTruthy()
  })

  it('a person at the office PC sees the dashboard with the normal header', () => {
    device = { kind: 'person', person: { id: 'r', name: 'Reto' } } as DeviceStatus
    renderAt('/')

    expect(screen.getByRole('banner').textContent).toContain('Testgarage')
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })
})
