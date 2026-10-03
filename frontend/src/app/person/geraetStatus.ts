import type { Mitarbeiter } from '../../features/mitarbeiter/mitarbeiterApi'
import type { GeraetWahl } from '../../lib/geraetPerson'

/**
 * Was darf dieses Gerät gerade?
 *
 * - `laedt`        Mitarbeiterliste kommt noch
 * - `waehlen`      Gerät muss zuerst sagen, wer es benutzt (oder «nur ansehen»)
 * - `person`       Person gewählt und aktiv → darf ändern
 * - `ansehen`      «nur ansehen» (Werkstatt-TV) → darf nichts ändern
 * - `einrichtung`  Noch niemand erfasst → niemand wählbar, Ändern erlaubt (Backend ebenso)
 * - `unbekannt`    Liste nicht ladbar (Server weg) → nicht blockieren, Seiten zeigen den Fehler
 */
export type GeraetStatus =
  | { art: 'laedt' }
  | { art: 'waehlen'; nichtMehrAktiv?: string }
  | { art: 'person'; person: Mitarbeiter }
  | { art: 'ansehen' }
  | { art: 'einrichtung' }
  | { art: 'unbekannt' }

export function geraetStatus(wahl: GeraetWahl | null, aktive: Mitarbeiter[] | undefined, ladeFehler: boolean): GeraetStatus {
  if (ladeFehler) return { art: 'unbekannt' }
  if (!aktive) return { art: 'laedt' }
  if (aktive.length === 0) return { art: 'einrichtung' }
  if (wahl?.art === 'ansehen') return { art: 'ansehen' }
  if (wahl?.art === 'person') {
    const person = aktive.find((m) => m.id === wahl.id)
    // Gewählte Person wurde deaktiviert → neu wählen (Backend würde Änderungen sonst ablehnen)
    return person ? { art: 'person', person } : { art: 'waehlen', nichtMehrAktiv: wahl.id }
  }
  return { art: 'waehlen' }
}

export function darfAendern(status: GeraetStatus): boolean {
  return status.art === 'person' || status.art === 'einrichtung'
}
