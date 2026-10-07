import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { untilNextMinute, useClock } from './clock'

function Show() {
  const { today, time } = useClock()
  return (
    <p>
      {today} {time}
    </p>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('clock', () => {
  it('waits until just after the next full minute', () => {
    expect(untilNextMinute(new Date('2026-10-15T08:05:30.000Z'))).toBe(30_050)
    expect(untilNextMinute(new Date('2026-10-15T08:05:00.000Z'))).toBe(60_050)
  })

  it('moves on over midnight without reloading (bug #15)', () => {
    vi.useFakeTimers()
    // 23:59 in Zurich (summer time = UTC+2)
    vi.setSystemTime(new Date('2026-10-15T21:59:10.000Z'))
    render(<Show />)
    expect(screen.getByText('2026-10-15 23:59')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByText('2026-10-16 00:00')).toBeTruthy()
  })
})
