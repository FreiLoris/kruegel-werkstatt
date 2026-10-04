import { textOn } from './colors'
import styles from './NameBadge.module.css'

/**
 * A person's name on their color – the same everywhere (list, later pinboard, appointments,
 * calendar). The text color follows from the background so every name stays readable.
 */
export function NameBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className={`${styles.badge} ${styles[textOn(color)]}`} style={{ backgroundColor: color }}>
      {name}
    </span>
  )
}
