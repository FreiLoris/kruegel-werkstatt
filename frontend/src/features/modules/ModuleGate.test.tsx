import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ModuleGate, ModulePage } from './ModuleGate'

let settings: { modules: { module: string; on: boolean }[] } | undefined
let error: Error | null = null

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: settings, error }) }))

const off = (module: string) => ({ modules: [{ module, on: false }] })

describe('ModuleGate (neutral 3)', () => {
  it('shows a module’s part while it is on – and while the settings are still loading', () => {
    settings = undefined
    render(<ModuleGate module="TIRE_HOTEL">Pneuhotel</ModuleGate>)
    expect(screen.getByText('Pneuhotel')).toBeTruthy()
  })

  it('without the server too – the app was all on before', () => {
    settings = undefined
    error = new Error('offline')
    render(<ModuleGate module="TIRE_HOTEL">Pneuhotel</ModuleGate>)
    expect(screen.getByText('Pneuhotel')).toBeTruthy()
    error = null
  })

  it('hides it when the workshop switched it off – the others stay', () => {
    settings = off('TIRE_HOTEL')
    render(
      <>
        <ModuleGate module="TIRE_HOTEL">Pneuhotel</ModuleGate>
        <ModuleGate module="STATISTICS">Statistik</ModuleGate>
      </>,
    )
    expect(screen.queryByText('Pneuhotel')).toBeNull()
    expect(screen.getByText('Statistik')).toBeTruthy()
  })

  it('a page of a module switched off says so and where to switch it on', () => {
    settings = off('STATISTICS')
    render(
      <MemoryRouter>
        <ModulePage module="STATISTICS">Zahlen</ModulePage>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Zahlen')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Ausgeschaltet' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Module/ }).getAttribute('href')).toBe('/settings#module')
  })
})
