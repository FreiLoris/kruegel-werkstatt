import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFollowPerson } from './useFollowPerson'

describe('useFollowPerson (FB-29)', () => {
  it('says each switch with the person before – not the first render', () => {
    const onSwitch = vi.fn()
    const { rerender } = renderHook(({ me }) => useFollowPerson(me, onSwitch), { initialProps: { me: 'reto' as string | undefined } })
    expect(onSwitch).not.toHaveBeenCalled()

    rerender({ me: 'mora' })
    expect(onSwitch).toHaveBeenLastCalledWith('reto', 'mora')
  })

  it('"Nur ansehen" in between keeps the last person', () => {
    const onSwitch = vi.fn()
    const { rerender } = renderHook(({ me }) => useFollowPerson(me, onSwitch), { initialProps: { me: 'reto' as string | undefined } })

    rerender({ me: undefined })
    rerender({ me: 'mora' })

    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenLastCalledWith('reto', 'mora')
  })
})
