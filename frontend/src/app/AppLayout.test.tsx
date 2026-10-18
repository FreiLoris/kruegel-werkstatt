import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '../components/ui/Confirm'
import { AppLayout } from './AppLayout'
import { IDLE_MS } from './kiosk/useBackToDashboard'
import type { DeviceStatus } from './person/deviceStatus'

let device: DeviceStatus = { kind: 'viewOnly' }

vi.mock('./live/useLiveUpdates', () => ({ useLiveUpdates: () => 'connected' }))
vi.mock('./person/useDevicePerson', () => ({ useDevicePerson: () => device, useCanEdit: () => false }))
vi.mock('./person/PersonMenu', () => ({ PersonMenu: () => null }))
vi.mock('./CustomerQuickSearch', () => ({ CustomerQuickSearch: () => null }))
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
          { path: 'tasks/new', element: <p>Neuer-Auftrag-Seite</p> },
          { path: 'tasks/:id', element: <p>Auftrag-Seite</p> },
          { path: 'stock', element: <p>Lager-Seite</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <ConfirmProvider>
      <RouterProvider router={router} />
    </ConfirmProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('AppLayout', () => {
  it('the TV shows the dashboard full screen: no header, navigation at the bottom', () => {
    device = { kind: 'viewOnly' }
    renderAt('/')

    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Live')
    // larger and with more contrast, with date and time
    expect(document.querySelector('[data-kiosk]')).not.toBeNull()
    expect(document.querySelector('time')).not.toBeNull()
  })

  it('the TV links only what it can use – no "Neuer Auftrag", no administration (UX M-23)', () => {
    device = { kind: 'viewOnly' }
    renderAt('/')

    const links = screen.getAllByRole('link').map((link) => link.textContent)
    expect(links).toEqual(expect.arrayContaining(['Start', 'Termine', 'Pneuhotel', 'Pinnwand', 'To-dos']))
    expect(links).not.toContain('Neuer Auftrag')
    expect(links).not.toContain('Einstellungen')
  })

  it('the TV returns to the dashboard by itself – touching restarts the wait', () => {
    vi.useFakeTimers()
    device = { kind: 'viewOnly' }
    renderAt('/tasks')

    act(() => {
      vi.advanceTimersByTime(IDLE_MS - 1000)
    })
    fireEvent.pointerDown(window)
    act(() => {
      vi.advanceTimersByTime(IDLE_MS - 1000)
    })
    expect(screen.getByText('Termine-Seite')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('a person is never sent back', () => {
    vi.useFakeTimers()
    device = { kind: 'person', person: { id: 'r', name: 'Reto' } } as DeviceStatus
    renderAt('/tasks')

    act(() => {
      vi.advanceTimersByTime(IDLE_MS * 3)
    })

    expect(screen.getByText('Termine-Seite')).toBeTruthy()
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

  it.each([
    ['/tasks', 'Termine'],
    ['/tasks/new', 'Neuer Auftrag'],
    ['/tasks/123', 'Termine'],
    ['/stock', 'Material'],
  ])('on %s exactly one navigation entry is active: %s', (path, title) => {
    device = { kind: 'person', person: { id: 'r', name: 'Reto' } } as DeviceStatus
    renderAt(path)

    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' })
    const active = [...nav.querySelectorAll('a')].filter((link) => link.className.includes('active'))
    expect(active.map((link) => link.textContent)).toEqual([title])
  })
})
