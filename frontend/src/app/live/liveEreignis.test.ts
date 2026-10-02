import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { beiAenderung } from './liveEreignis'

describe('beiAenderung', () => {
  it('lädt alle Abfragen des gemeldeten Bereichs neu', () => {
    const queryClient = new QueryClient()
    const neuLaden = vi.spyOn(queryClient, 'invalidateQueries')

    beiAenderung('{"bereich":"mitarbeiter"}', queryClient)

    expect(neuLaden).toHaveBeenCalledWith({ queryKey: ['mitarbeiter'] })
  })

  it('markiert nur den betroffenen Bereich als veraltet', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['mitarbeiter'], [])
    queryClient.setQueryData(['mitarbeiter', 'id-1'], {})
    queryClient.setQueryData(['auftraege'], [])

    beiAenderung('{"bereich":"mitarbeiter"}', queryClient)

    expect(queryClient.getQueryState(['mitarbeiter'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['mitarbeiter', 'id-1'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['auftraege'])?.isInvalidated).toBe(false)
  })

  it('ignoriert unlesbare Nachrichten', () => {
    const queryClient = new QueryClient()
    const neuLaden = vi.spyOn(queryClient, 'invalidateQueries')
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    beiAenderung('kein json', queryClient)

    expect(neuLaden).not.toHaveBeenCalled()
  })
})
