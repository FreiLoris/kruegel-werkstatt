import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSingleFlight } from './useSingleFlight'

describe('useSingleFlight', () => {
  it('a second call while the first one runs is ignored – again possible once it is done', () => {
    const { result } = renderHook(() => useSingleFlight())
    const save = vi.fn()
    let finish = () => {}

    act(() => result.current((done) => { save(); finish = done }))
    act(() => result.current(() => save()))
    expect(save).toHaveBeenCalledTimes(1)

    act(() => finish())
    act(() => result.current(() => save()))
    expect(save).toHaveBeenCalledTimes(2)
  })
})
