import { groupDigits, parsePlate } from '../../lib/licensePlate'
import styles from './LicensePlate.module.css'

/** Coats of arms by canton code – Vite turns every SVG into a URL of the built file. */
const ARMS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../assets/coats-of-arms/*.svg', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.slice(-6, -4), url]),
)

/**
 * A license plate as it looks on the car: Swiss flag · canton · number · coat of arms
 * (reference: real Swiss plate). Foreign plates show the country code, other texts as they are.
 *
 * Accessible: screen readers hear "Kennzeichen SG 197052" instead of single parts.
 */
export function LicensePlate({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' | 'lg' }) {
  const plate = parsePlate(text)
  const classes = `${styles.plate} ${styles[size]}`

  if (plate.kind === 'swiss') {
    return (
      <span className={classes} role="img" aria-label={`Kennzeichen ${text}`}>
        <SwissFlag />
        <span className={styles.text}>
          {plate.canton}
          <span className={styles.dot}>·</span>
          {groupDigits(plate.number)}
        </span>
        {ARMS[plate.canton] && <img className={styles.arms} src={ARMS[plate.canton]} alt="" />}
      </span>
    )
  }
  if (plate.kind === 'foreign') {
    return (
      <span className={classes} role="img" aria-label={`Kennzeichen ${text}`}>
        <span className={styles.country}>{plate.country}</span>
        <span className={styles.text}>{plate.number}</span>
      </span>
    )
  }
  return (
    <span className={classes} role="img" aria-label={`Kennzeichen ${text}`}>
      <span className={styles.text}>{plate.text}</span>
    </span>
  )
}

/** Swiss flag: red square with a white cross (proportions as in the federal regulation). */
function SwissFlag() {
  return (
    <svg className={styles.flag} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" fill="var(--color-swiss-red)" />
      <rect x="13" y="6" width="6" height="20" fill="var(--color-plate-background)" />
      <rect x="6" y="13" width="20" height="6" fill="var(--color-plate-background)" />
    </svg>
  )
}
