import { Eye } from 'lucide-react'
import type { Employee } from '../../features/employees/employeeApi'
import { NameBadge } from '../../features/employees/NameBadge'
import { choose } from '../../lib/devicePerson'
import styles from './PersonPicker.module.css'

/**
 * "Who uses this device?" – shown instead of the page until the device has chosen.
 * Large buttons (touch), one tap is enough. The choice stays stored on the device.
 */
export function PersonPicker({ active, noLongerActive }: { active: Employee[]; noLongerActive?: boolean }) {
  return (
    <section className={styles.picker} aria-labelledby="person-picker-title">
      <h1 id="person-picker-title">Wer benutzt dieses Gerät?</h1>
      <p className="muted">
        {noLongerActive
          ? 'Die bisher gewählte Person ist nicht mehr aktiv. Bitte neu wählen.'
          : 'Einmal auswählen – das Gerät merkt es sich. Änderungen erscheinen dann mit diesem Namen.'}
      </p>

      <ul className={styles.people}>
        {active.map((e) => (
          <li key={e.id}>
            <button type="button" className={styles.person} onClick={() => choose({ kind: 'person', id: e.id })}>
              <NameBadge name={e.name} color={e.color} />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className={styles.viewOnly} onClick={() => choose({ kind: 'viewOnly' })}>
        <Eye aria-hidden />
        <span>
          <strong>Nur ansehen</strong>
          <span className="muted"> – z. B. Werkstatt-TV, kann nichts ändern</span>
        </span>
      </button>
    </section>
  )
}
