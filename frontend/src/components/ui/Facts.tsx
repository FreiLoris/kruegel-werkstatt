import type { ReactNode } from 'react'
import styles from './Facts.module.css'

/**
 * "Label: value" rows as a description list – for read-only data (task detail, review).
 * Rows without value are left out, so nothing shows "–" for every empty field.
 */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  const filled = rows.filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== false)
  if (filled.length === 0) return null
  return (
    <dl className={styles.facts}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
