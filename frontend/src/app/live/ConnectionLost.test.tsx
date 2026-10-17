import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectionLost, SHOW_AFTER_MS } from './ConnectionLost'

describe('ConnectionLost', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a short gap (server restart) shows nothing, a longer one a bar – gone once connected again', () => {
    const { rerender } = render(<ConnectionLost status="disconnected" />)
    act(() => vi.advanceTimersByTime(SHOW_AFTER_MS - 1))
    expect(screen.queryByRole('alert')).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('alert').textContent).toContain('Keine Verbindung zum Server seit')

    rerender(<ConnectionLost status="connected" />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
