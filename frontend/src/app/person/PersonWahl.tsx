import { Eye } from 'lucide-react'
import { Namensschild } from '../../features/mitarbeiter/Namensschild'
import type { Mitarbeiter } from '../../features/mitarbeiter/mitarbeiterApi'
import { waehlen } from '../../lib/geraetPerson'
import styles from './PersonWahl.module.css'

/**
 * «Wer benutzt dieses Gerät?» – erscheint anstelle der Seite, bis das Gerät gewählt hat.
 * Grosse Knöpfe (Touch), ein Tipp genügt. Die Wahl bleibt auf dem Gerät gespeichert.
 */
export function PersonWahl({ aktive, nichtMehrAktiv }: { aktive: Mitarbeiter[]; nichtMehrAktiv?: boolean }) {
  return (
    <section className={styles.wahl} aria-labelledby="person-wahl-titel">
      <h1 id="person-wahl-titel">Wer benutzt dieses Gerät?</h1>
      <p className="gedaempft">
        {nichtMehrAktiv
          ? 'Die bisher gewählte Person ist nicht mehr aktiv. Bitte neu wählen.'
          : 'Einmal auswählen – das Gerät merkt es sich. Änderungen erscheinen dann mit diesem Namen.'}
      </p>

      <ul className={styles.personen}>
        {aktive.map((m) => (
          <li key={m.id}>
            <button type="button" className={styles.person} onClick={() => waehlen({ art: 'person', id: m.id })}>
              <Namensschild name={m.name} farbe={m.farbe} />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className={styles.ansehen} onClick={() => waehlen({ art: 'ansehen' })}>
        <Eye aria-hidden />
        <span>
          <strong>Nur ansehen</strong>
          <span className="gedaempft"> – z. B. Werkstatt-TV, kann nichts ändern</span>
        </span>
      </button>
    </section>
  )
}
