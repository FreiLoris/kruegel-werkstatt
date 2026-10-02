/**
 * Zentrale Formatierung für die Anzeige. Das Backend liefert immer ISO-Werte,
 * Menschen sehen immer das Schweizer Format.
 *
 *   Datum      "2026-10-15"            → "15.10.2026"
 *   Uhrzeit    "08:00:00"              → "08:00"
 *   Zeitpunkt  "2026-10-15T06:00:00Z"  → "15.10.2026, 08:00"  (in Schweizer Zeit)
 *
 * Regel: Nirgends sonst im Frontend Datumswerte selbst formatieren.
 */

const ZEITZONE = 'Europe/Zurich'

const ISO_DATUM = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_UHRZEIT = /^(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?$/

const zeitpunktFormat = new Intl.DateTimeFormat('de-CH', {
  timeZone: ZEITZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Fachliches Datum (ohne Uhrzeit, ohne Zeitzone).
 *
 * Bewusst per Text-Zerlegung statt `new Date("2026-10-15")`: Das würde als
 * Mitternacht UTC gelesen und könnte je nach Zeitzone als Vortag angezeigt werden.
 */
export function formatDatum(isoDatum: string): string {
  const treffer = ISO_DATUM.exec(isoDatum)
  if (!treffer) {
    throw new Error(`Kein gültiges ISO-Datum: "${isoDatum}"`)
  }
  const [, jahr, monat, tag] = treffer
  return `${tag}.${monat}.${jahr}`
}

/** Fachliche Uhrzeit, ohne Sekunden. */
export function formatUhrzeit(isoUhrzeit: string): string {
  const treffer = ISO_UHRZEIT.exec(isoUhrzeit)
  if (!treffer) {
    throw new Error(`Keine gültige ISO-Uhrzeit: "${isoUhrzeit}"`)
  }
  const [, stunde, minute] = treffer
  return `${stunde}:${minute}`
}

/** Zeitpunkt (z. B. "erstellt am"), umgerechnet in Schweizer Zeit inkl. Sommerzeit. */
export function formatZeitpunkt(isoZeitpunkt: string): string {
  const datum = new Date(isoZeitpunkt)
  if (Number.isNaN(datum.getTime())) {
    throw new Error(`Kein gültiger ISO-Zeitpunkt: "${isoZeitpunkt}"`)
  }
  return zeitpunktFormat.format(datum)
}
