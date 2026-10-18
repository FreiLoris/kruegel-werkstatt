import styles from './AppointmentStep.module.css'

/** The hints of {@link dayWarnings} – yellow, saving stays possible. */
export function AppointmentWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className={styles.warnings} aria-label="Hinweise">
      {warnings.map((warning) => (
        <li key={warning} className={styles.warning}>
          {warning}
        </li>
      ))}
    </ul>
  )
}
