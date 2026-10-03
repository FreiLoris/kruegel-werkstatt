import { afterEach, describe, expect, it, vi } from 'vitest'
import { abonnieren, geraetWahl, personIdFuerAnfragen, waehlen, wahlZuruecksetzen } from './geraetPerson'

afterEach(() => {
  localStorage.clear()
})

describe('geraetPerson', () => {
  it('ist am Anfang leer', () => {
    expect(geraetWahl()).toBeNull()
    expect(personIdFuerAnfragen()).toBeUndefined()
  })

  it('merkt sich die gewählte Person', () => {
    waehlen({ art: 'person', id: 'abc' })

    expect(geraetWahl()).toEqual({ art: 'person', id: 'abc' })
    expect(personIdFuerAnfragen()).toBe('abc')
  })

  it('schickt bei «nur ansehen» keine Person mit', () => {
    waehlen({ art: 'ansehen' })

    expect(geraetWahl()).toEqual({ art: 'ansehen' })
    expect(personIdFuerAnfragen()).toBeUndefined()
  })

  it('liefert dasselbe Objekt, solange sich nichts ändert (sonst zeichnet React endlos neu)', () => {
    waehlen({ art: 'person', id: 'abc' })
    expect(geraetWahl()).toBe(geraetWahl())
  })

  it('behandelt einen kaputten Eintrag wie «nichts gewählt»', () => {
    localStorage.setItem('werkstatt.geraetPerson', '{kaputt')
    expect(geraetWahl()).toBeNull()
  })

  it('benachrichtigt bei Wahl und Zurücksetzen', () => {
    const beiAenderung = vi.fn()
    const abmelden = abonnieren(beiAenderung)

    waehlen({ art: 'ansehen' })
    wahlZuruecksetzen()
    abmelden()
    waehlen({ art: 'ansehen' })

    expect(beiAenderung).toHaveBeenCalledTimes(2)
    expect(geraetWahl()).toEqual({ art: 'ansehen' })
  })
})
