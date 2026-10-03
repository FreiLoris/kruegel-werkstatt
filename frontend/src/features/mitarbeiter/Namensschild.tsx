import { textAufFarbe } from './farben'
import styles from './Namensschild.module.css'

/**
 * Name einer Person auf ihrer Farbe – überall gleich (Liste, später Pinnwand, Termine, Kalender).
 * Die Schriftfarbe ergibt sich automatisch aus dem Hintergrund, damit jeder Name lesbar bleibt.
 */
export function Namensschild({ name, farbe }: { name: string; farbe: string }) {
  return (
    <span className={`${styles.schild} ${styles[textAufFarbe(farbe)]}`} style={{ backgroundColor: farbe }}>
      {name}
    </span>
  )
}
