import { freieFarbe } from './farben'
import type { Mitarbeiter, MitarbeiterEingabe, Rolle } from './mitarbeiterApi'

/**
 * Formularzustand. Zahlen und Datum bleiben Text, solange getippt wird
 * (ein halb eingegebenes Datum ist noch kein Datum) – umgewandelt wird erst beim Absenden.
 */
export interface Formularwerte {
  name: string
  rolle: Rolle
  farbe: string
  geburtstag: string
  ferienanspruch: string
  alsMechanikerWaehlbar: boolean
  fuerAufgabenWaehlbar: boolean
  pinnwandSpalte: boolean
}

/** Werte beim Öffnen: bestehende Person – oder sinnvolle Vorgaben für eine neue. */
export function startwerte(mitarbeiter: Mitarbeiter | undefined, belegteFarben: string[]): Formularwerte {
  if (mitarbeiter) {
    return {
      name: mitarbeiter.name,
      rolle: mitarbeiter.rolle,
      farbe: mitarbeiter.farbe,
      geburtstag: mitarbeiter.geburtstag ?? '',
      ferienanspruch: String(mitarbeiter.ferienanspruch),
      alsMechanikerWaehlbar: mitarbeiter.alsMechanikerWaehlbar,
      fuerAufgabenWaehlbar: mitarbeiter.fuerAufgabenWaehlbar,
      pinnwandSpalte: mitarbeiter.pinnwandSpalte,
    }
  }
  return {
    name: '',
    rolle: 'MECHANIKER',
    farbe: freieFarbe(belegteFarben),
    geburtstag: '',
    ferienanspruch: '25',
    alsMechanikerWaehlbar: true,
    fuerAufgabenWaehlbar: true,
    pinnwandSpalte: true,
  }
}

/** Formularwerte → JSON für die API. `version` nur beim Bearbeiten. */
export function alsEingabe(werte: Formularwerte, version?: number): MitarbeiterEingabe {
  return {
    name: werte.name.trim(),
    rolle: werte.rolle,
    farbe: werte.farbe.toLowerCase(),
    geburtstag: werte.geburtstag || undefined,
    ferienanspruch: Number(werte.ferienanspruch),
    alsMechanikerWaehlbar: werte.alsMechanikerWaehlbar,
    fuerAufgabenWaehlbar: werte.fuerAufgabenWaehlbar,
    pinnwandSpalte: werte.pinnwandSpalte,
    version,
  }
}
