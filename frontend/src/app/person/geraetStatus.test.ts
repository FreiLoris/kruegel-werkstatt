import { describe, expect, it } from 'vitest'
import type { Mitarbeiter } from '../../features/mitarbeiter/mitarbeiterApi'
import { darfAendern, geraetStatus } from './geraetStatus'

const erich = { id: 'erich', name: 'Erich' } as Mitarbeiter

describe('geraetStatus', () => {
  it('fragt nach, solange nichts gewählt ist', () => {
    expect(geraetStatus(null, [erich], false)).toEqual({ art: 'waehlen' })
  })

  it('erkennt die gewählte aktive Person', () => {
    const status = geraetStatus({ art: 'person', id: 'erich' }, [erich], false)
    expect(status).toEqual({ art: 'person', person: erich })
    expect(darfAendern(status)).toBe(true)
  })

  it('fragt neu, wenn die gewählte Person nicht mehr aktiv ist', () => {
    expect(geraetStatus({ art: 'person', id: 'mora' }, [erich], false)).toEqual({ art: 'waehlen', nichtMehrAktiv: 'mora' })
  })

  it('«nur ansehen» darf nichts ändern', () => {
    const status = geraetStatus({ art: 'ansehen' }, [erich], false)
    expect(status.art).toBe('ansehen')
    expect(darfAendern(status)).toBe(false)
  })

  it('Ersteinrichtung: ohne Mitarbeiter darf geändert werden', () => {
    const status = geraetStatus(null, [], false)
    expect(status.art).toBe('einrichtung')
    expect(darfAendern(status)).toBe(true)
  })

  it('blockiert nicht, wenn die Liste nicht geladen werden kann', () => {
    expect(geraetStatus(null, undefined, true).art).toBe('unbekannt')
    expect(geraetStatus(null, undefined, false).art).toBe('laedt')
  })
})
