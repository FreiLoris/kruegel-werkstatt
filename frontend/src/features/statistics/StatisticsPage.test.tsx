import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Statistics } from './statisticsApi'
import { StatisticsPage } from './StatisticsPage'
import { testStatistics } from './testStatistics'

let stats: Statistics | undefined
let loadError: Error | null = null

vi.mock('./statisticsApi', () => ({
  useStatistics: () => ({ data: stats, error: loadError, refetch: vi.fn() }),
}))

/** The box a heading of a chart stands in */
const card = (heading: HTMLElement) => heading.parentElement!

describe('StatisticsPage', () => {
  it('a section per area, each reachable from the bar at the top', () => {
    stats = testStatistics()
    render(<StatisticsPage />)

    const jump = screen.getByRole('navigation', { name: 'Bereiche' })
    expect(within(jump).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#fun',
      '#tasks',
      '#vehicles',
      '#customers',
      '#tires',
      '#team',
      '#material',
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Aufträge' })).toBeTruthy()
    expect(screen.getByText('Stand 25.10.2026', { exact: false })).toBeTruthy()
  })

  it('big numbers with their share; the record month of the chart is told in words', () => {
    stats = testStatistics()
    render(<StatisticsPage />)

    const tasks = screen.getByRole('region', { name: 'Aufträge' })
    expect(tasks.textContent).toContain('120Aufträge totalseit 05.01.2026')
    expect(tasks.textContent).toContain('90Fertig75 % aller Aufträge')
    expect(tasks.textContent).toContain('1 Std. 30 Min.Ø auf dem Lift')
    expect(screen.getByText('Okt 2026: 12 Aufträge')).toBeTruthy()
    expect(screen.getByText('Dienstag: 30 Termine')).toBeTruthy()
  })

  it('the next birthday counts the days; absences only as a team total', () => {
    stats = testStatistics()
    render(<StatisticsPage />)

    const team = screen.getByRole('region', { name: 'Team' })
    expect(team.textContent).toContain('Beathat in 3 Tagen Geburtstag28.10.2026 · wird 40')
    const absences = card(within(team).getByRole('heading', { name: 'Abwesenheiten 2026 (ganzes Team)' }))
    expect(absences.textContent).toContain('Ferien60,5 Tage · 91 %')
    // nothing counted: not in the legend
    expect(absences.textContent).not.toContain('Fremdarbeit')
  })

  it('an empty ranking says so instead of an empty box', () => {
    stats = testStatistics()
    render(<StatisticsPage />)

    expect(within(card(screen.getByRole('heading', { name: 'Angenommen von' }))).getByText('Noch keine Daten')).toBeTruthy()
  })

  it('loading and a failed load are told in words', () => {
    stats = undefined
    const { unmount } = render(<StatisticsPage />)
    expect(screen.getByRole('status').textContent).toBe('Zählt …')
    unmount()

    loadError = new Error('kaputt')
    render(<StatisticsPage />)
    expect(screen.getByRole('alert').textContent).toContain('Die Statistik konnte nicht geladen werden.')
    expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeTruthy()
    loadError = null
  })
})
