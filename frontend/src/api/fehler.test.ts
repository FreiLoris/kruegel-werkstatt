import { describe, expect, it } from 'vitest'
import { ApiFehler, datenOderFehler } from './fehler'

function antwort(status: number): Response {
  return new Response(null, { status })
}

/** Führt die Funktion aus und gibt den geworfenen ApiFehler zurück. */
function fangeApiFehler(funktion: () => unknown): ApiFehler {
  try {
    funktion()
  } catch (e) {
    expect(e).toBeInstanceOf(ApiFehler)
    return e as ApiFehler
  }
  throw new Error('Es wurde kein Fehler geworfen')
}

describe('datenOderFehler', () => {
  it('liefert die Daten bei Erfolg', () => {
    const daten = datenOderFehler({ data: { name: 'Reto' }, response: antwort(200) })
    expect(daten).toEqual({ name: 'Reto' })
  })

  it('wirft ApiFehler mit den Problem Details des Backends', () => {
    const problem = {
      status: 400,
      title: 'Ungültige Eingabe',
      detail: 'Bitte die markierten Felder korrigieren.',
      fehler: [{ feld: 'name', meldung: 'darf nicht leer sein' }],
    }

    const fehler = fangeApiFehler(() => datenOderFehler({ error: problem, response: antwort(400) }))

    expect(fehler.message).toBe('Bitte die markierten Felder korrigieren.')
    expect(fehler.meldungFuerFeld('name')).toBe('darf nicht leer sein')
    expect(fehler.meldungFuerFeld('vorname')).toBeUndefined()
    expect(fehler.istKonflikt).toBe(false)
  })

  it('erkennt Konflikte (409)', () => {
    const fehler = fangeApiFehler(() => datenOderFehler({ error: { status: 409 }, response: antwort(409) }))

    expect(fehler.istKonflikt).toBe(true)
  })

  it('liefert verständliche Meldung, wenn der Server nicht antwortet', () => {
    const fehler = fangeApiFehler(() => datenOderFehler({ error: 'Bad Gateway', response: antwort(502) }))

    expect(fehler.message).toBe('Keine gültige Antwort vom Server.')
    expect(fehler.problem.status).toBe(502)
  })
})
