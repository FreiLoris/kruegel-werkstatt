import { textOn } from './colors'
import { initialsOf } from './initials'
import styles from './NameBadge.module.css'

/**
 * A person's name on their color – the same everywhere (list, later pinboard, appointments,
 * calendar). The text color follows from the background so every name stays readable.
 *
 * @param short only the initials (the full name in the tooltip) – where the customer needs the room (UX G-20)
 */
export function NameBadge({ name, color, short = false }: { name: string; color: string; short?: boolean }) {
  return (
    <span
      className={`${styles.badge} ${styles[textOn(color)]}`}
      style={{ backgroundColor: color }}
      title={short ? name : undefined}
      aria-label={short ? name : undefined}
    >
      {short ? initialsOf(name) : name}
    </span>
  )
}
