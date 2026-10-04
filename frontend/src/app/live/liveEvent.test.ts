import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { onDataChanged } from './liveEvent'

describe('onDataChanged', () => {
  it('reloads all queries of the reported topic', () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    onDataChanged('{"topic":"employees"}', queryClient)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['employees'] })
  })

  it('marks only the affected topic as stale', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['employees'], [])
    queryClient.setQueryData(['employees', 'id-1'], {})
    queryClient.setQueryData(['tasks'], [])

    onDataChanged('{"topic":"employees"}', queryClient)

    expect(queryClient.getQueryState(['employees'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['employees', 'id-1'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['tasks'])?.isInvalidated).toBe(false)
  })

  it('ignores unreadable messages', () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    onDataChanged('not json', queryClient)

    expect(invalidate).not.toHaveBeenCalled()
  })
})
