import type { FormEvent } from 'react'
import { ApiFehler } from '../../api/fehler'
import { Auswahl, Checkbox, Textfeld } from '../../components/ui/Felder'
import { FARBVORSCHLAEGE } from './farben'
import type { Formularwerte } from './formularwerte'
import { ROLLEN, type Rolle } from './mitarbeiterApi'
import styles from './MitarbeiterFormular.module.css'
import { Namensschild } from './Namensschild'

interface MitarbeiterFormularProps {
  /** Damit ein Button ausserhalb (im Modal-Fuss) das Formular absenden kann: `<button form={id}>` */
  id: string
  werte: Formularwerte
  onAendern: (werte: Formularwerte) => void
  onAbsenden: () => void
  /** Fehler vom letzten Speichern – Feldfehler erscheinen direkt beim Feld */
  fehler?: Error | null
  /** Farben anderer aktiver Personen: Farbe (#rrggbb, klein) → Name */
  farbenVergeben: Map<string, string>
}

export function MitarbeiterFormular({ id, werte, onAendern, onAbsenden, fehler, farbenVergeben }: MitarbeiterFormularProps) {
  const feldfehler = (feld: string) => (fehler instanceof ApiFehler ? fehler.meldungFuerFeld(feld) : undefined)
  const setze = <K extends keyof Formularwerte>(feld: K, wert: Formularwerte[K]) => onAendern({ ...werte, [feld]: wert })

  const farbeVonPerson = farbenVergeben.get(werte.farbe.toLowerCase())
  const istEigeneFarbe = !FARBVORSCHLAEGE.some((f) => f.wert === werte.farbe.toLowerCase())

  function absenden(event: FormEvent) {
    event.preventDefault()
    onAbsenden()
  }

  return (
    <form id={id} className={styles.formular} onSubmit={absenden}>
      <Textfeld
        label="Name"
        pflicht
        placeholder="z. B. Erich"
        hinweis="So erscheint die Person in Auswahllisten und auf der Pinnwand."
        maxLength={40}
        autoComplete="off"
        value={werte.name}
        onChange={(e) => setze('name', e.target.value)}
        fehler={feldfehler('name')}
      />

      <div className={styles.reihe}>
        <Auswahl label="Rolle" pflicht value={werte.rolle} onChange={(e) => setze('rolle', e.target.value as Rolle)} fehler={feldfehler('rolle')}>
          {Object.entries(ROLLEN).map(([wert, text]) => (
            <option key={wert} value={wert}>
              {text}
            </option>
          ))}
        </Auswahl>
        <Textfeld
          label="Geburtstag"
          type="date"
          value={werte.geburtstag}
          onChange={(e) => setze('geburtstag', e.target.value)}
          fehler={feldfehler('geburtstag')}
        />
        <Textfeld
          label="Ferienanspruch"
          pflicht
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          hinweis="Tage pro Jahr"
          value={werte.ferienanspruch}
          onChange={(e) => setze('ferienanspruch', e.target.value)}
          fehler={feldfehler('ferienanspruch')}
        />
      </div>

      <fieldset className={styles.farbwahl} aria-describedby={`${id}-farbe-meldung`}>
        <legend className={styles.legende}>Farbe</legend>
        <div className={styles.felder}>
          {FARBVORSCHLAEGE.map((vorschlag) => {
            const vergebenAn = farbenVergeben.get(vorschlag.wert)
            return (
              <label
                key={vorschlag.wert}
                className={styles.feld}
                style={{ backgroundColor: vorschlag.wert }}
                title={vergebenAn ? `${vorschlag.name} – hat bereits ${vergebenAn}` : vorschlag.name}
              >
                <input
                  type="radio"
                  name={`${id}-farbe`}
                  value={vorschlag.wert}
                  checked={werte.farbe.toLowerCase() === vorschlag.wert}
                  onChange={() => setze('farbe', vorschlag.wert)}
                  aria-label={vergebenAn ? `${vorschlag.name} (hat bereits ${vergebenAn})` : vorschlag.name}
                />
                {vergebenAn && <span className={styles.vergeben} aria-hidden />}
              </label>
            )
          })}
          <label className={`${styles.eigene} ${istEigeneFarbe ? styles.eigeneAktiv : ''}`} title="Eigene Farbe wählen">
            <input type="color" value={werte.farbe} onChange={(e) => setze('farbe', e.target.value)} aria-label="Eigene Farbe" />
            Eigene
          </label>
        </div>
        <div id={`${id}-farbe-meldung`} className={styles.vorschau}>
          <Namensschild name={werte.name.trim() || 'Vorschau'} farbe={werte.farbe} />
          {feldfehler('farbe') ? (
            <span className={styles.fehler} role="alert">
              {feldfehler('farbe')}
            </span>
          ) : (
            farbeVonPerson && <span className={styles.warnung}>Diese Farbe hat bereits {farbeVonPerson}.</span>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.gruppe}>
        <legend className={styles.legende}>Erscheint bei</legend>
        <Checkbox
          label="Terminen – als Mechaniker wählbar"
          checked={werte.alsMechanikerWaehlbar}
          onChange={(e) => setze('alsMechanikerWaehlbar', e.target.checked)}
        />
        <Checkbox
          label="To-dos und Notizen – als zuständige Person wählbar"
          checked={werte.fuerAufgabenWaehlbar}
          onChange={(e) => setze('fuerAufgabenWaehlbar', e.target.checked)}
        />
        <Checkbox label="Pinnwand – mit eigener Spalte" checked={werte.pinnwandSpalte} onChange={(e) => setze('pinnwandSpalte', e.target.checked)} />
      </fieldset>
    </form>
  )
}
