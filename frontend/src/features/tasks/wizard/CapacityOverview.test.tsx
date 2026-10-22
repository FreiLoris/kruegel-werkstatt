import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CapacityOverview } from './CapacityOverview'

vi.mock('../taskApi', async (original) => ({
  ...(await original<typeof import('../taskApi')>()),
  useTasksBetween: () => ({ data: [] }),
  useTasksOfDay: () => ({ data: [] }),
}))
vi.mock('../../lifts/liftApi', () => ({ useAllLifts: () => ({ data: [] }) }))
vi.mock('../day/DayGrid', () => ({ DayGrid: ({ date }: { date: string }) => <p>Raster {date}</p> }))
// the week of "Termine › Woche" – a day of it opens the time grid
vi.mock('../week/WeekView', () => ({
  WeekView: ({ onOpenDay, readOnly }: { onOpenDay: (date: string) => void; readOnly: boolean }) => (
    <button type="button" onClick={() => onOpenDay('2026-10-21')}>
      Woche {readOnly ? 'nur ansehen' : 'bearbeiten'}
    </button>
  ),
}))

describe('CapacityOverview – Tag | Woche (FB-13)', () => {
  it('the week to look at; a day of it opens its grid and is taken for the task', () => {
    const onPickDay = vi.fn()
    const picked = { liftId: null, date: '2026-10-19', time: '08:00', endAt: '2026-10-19T09:00' }
    render(<CapacityOverview picked={picked} holidays={new Map()} onPickDay={onPickDay} onPickSlot={vi.fn()} />)

    expect(screen.getByText('Raster 2026-10-19')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Woche' }))
    expect(screen.queryByText(/^Raster/)).toBeNull()

    // nothing can be moved from there
    fireEvent.click(screen.getByRole('button', { name: 'Woche nur ansehen' }))
    expect(onPickDay).toHaveBeenCalledWith('2026-10-21')
    expect(screen.getByRole('button', { name: 'Tag' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Raster 2026-10-21')).toBeTruthy()
  })
})
