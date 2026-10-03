/**
 * «Wer benutzt dieses Gerät?» – einmal gewählt, im Browser gespeichert (localStorage).
 *
 * Kein Login: Jedes Gerät wählt eine Person oder «nur ansehen» (Werkstatt-TV). Die gewählte
 * Person geht bei jeder Anfrage als Header `X-Person` ans Backend (siehe `api/client.ts`),
 * das damit «geändert von» speichert und Änderungen ohne Person ablehnt.
 *
 * Bewusst ohne React: Auch der API-Client braucht den Wert. Komponenten lesen ihn über
 * `useGeraetPerson()`, das sich hier anmeldet und bei Änderungen neu zeichnet.
 */

export type GeraetWahl = { art: 'person'; id: string } | { art: 'ansehen' }

const SCHLUESSEL = 'werkstatt.geraetPerson'

const zuhoerer = new Set<() => void>()

// Zwischenspeicher: gleiche gespeicherte Zeichenkette → dasselbe Objekt.
// React (useSyncExternalStore) erkennt Änderungen am Objekt – ein neues Objekt bei jedem
// Lesen würde endlos neu zeichnen.
let letzterText: string | null = null
let letzteWahl: GeraetWahl | null = null

/** Aktuelle Wahl dieses Geräts, `null` = noch nichts gewählt. */
export function geraetWahl(): GeraetWahl | null {
  const text = speicherLesen()
  if (text !== letzterText) {
    letzterText = text
    letzteWahl = parsen(text)
  }
  return letzteWahl
}

export function waehlen(wahl: GeraetWahl): void {
  speicherSchreiben(JSON.stringify(wahl))
  benachrichtigen()
}

/** Wahl vergessen → das Gerät fragt beim nächsten Zeichnen wieder «Wer bist du?». */
export function wahlZuruecksetzen(): void {
  speicherSchreiben(null)
  benachrichtigen()
}

/** Für den Header `X-Person` – nur wenn eine Person (nicht «nur ansehen») gewählt ist. */
export function personIdFuerAnfragen(): string | undefined {
  const wahl = geraetWahl()
  return wahl?.art === 'person' ? wahl.id : undefined
}

/** Bei Änderungen benachrichtigen – auch wenn in einem anderen Tab desselben Browsers gewählt wird. */
export function abonnieren(beiAenderung: () => void): () => void {
  zuhoerer.add(beiAenderung)
  const ausAnderemTab = (event: StorageEvent) => {
    if (event.key === SCHLUESSEL) beiAenderung()
  }
  window.addEventListener('storage', ausAnderemTab)
  return () => {
    zuhoerer.delete(beiAenderung)
    window.removeEventListener('storage', ausAnderemTab)
  }
}

function benachrichtigen() {
  zuhoerer.forEach((zuhoererFn) => zuhoererFn())
}

function parsen(text: string | null): GeraetWahl | null {
  if (!text) return null
  try {
    const wert = JSON.parse(text) as Partial<GeraetWahl>
    if (wert.art === 'ansehen') return { art: 'ansehen' }
    if (wert.art === 'person' && typeof wert.id === 'string') return { art: 'person', id: wert.id }
  } catch {
    // kaputter Eintrag → wie nichts gewählt
  }
  return null
}

// localStorage kann fehlen oder gesperrt sein (privates Fenster, strenge Einstellungen).
// Dann fragt das Gerät eben bei jedem Laden neu – die App funktioniert trotzdem.
function speicherLesen(): string | null {
  try {
    return localStorage.getItem(SCHLUESSEL)
  } catch {
    return null
  }
}

function speicherSchreiben(text: string | null) {
  try {
    if (text === null) localStorage.removeItem(SCHLUESSEL)
    else localStorage.setItem(SCHLUESSEL, text)
  } catch {
    // siehe oben
  }
}
