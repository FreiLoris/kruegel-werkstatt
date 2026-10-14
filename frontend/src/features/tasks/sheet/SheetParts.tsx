import type { ReactNode } from 'react'
import styles from './TaskSheet.module.css'

/** A titled section of the task sheet. */
export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** Label/value rows; empty values are left out. */
export function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const filled = rows.filter((row): row is [string, string] => !!row[1])
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

/** An empty box to tick by hand. */
export function Box() {
  return <span className={styles.box} aria-hidden />
}

/** An empty line to write on. */
export function WriteIn({ wide = false }: { wide?: boolean }) {
  return <span className={wide ? styles.writeLineWide : styles.writeLine} aria-hidden />
}
