import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DueDate } from './DueDate'

describe('DueDate', () => {
  it('shows the Swiss date without warning when ok', () => {
    render(<DueDate date="2027-03-01" status="OK" kind="service" />)

    expect(screen.getByText('01.03.2027')).toBeTruthy()
    expect(screen.queryByText(/fällig|abgelaufen/)).toBeNull()
  })

  it('warns in words, not only by color', () => {
    render(<DueDate date="2026-10-01" status="OVERDUE" kind="service" />)
    expect(screen.getByText('überfällig')).toBeTruthy()
  })

  it('uses the wording of the kind of date', () => {
    render(<DueDate date="2026-10-20" status="DUE_SOON" kind="insurance" />)
    expect(screen.getByText('läuft bald ab')).toBeTruthy()
  })

  it('shows a dash without date', () => {
    render(<DueDate date={null} status={null} kind="service" />)
    expect(screen.getByText('–')).toBeTruthy()
  })
})
