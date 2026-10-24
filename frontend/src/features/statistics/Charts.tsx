import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { formatCount, formatPercent } from '../../lib/format'
import styles from './Statistics.module.css'

/** Colours for parts without a colour of their own – tokens only, distinct from each other */
const PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-status-waiting)',
  'var(--color-absence-external)',
  'var(--color-absence-vacation)',
  'var(--color-absence-training)',
  'var(--color-text-muted)',
]

export interface Bar {
  label: string
  count: number
  /** Longer text for the tooltip, e.g. "Okt 2026" for the column "Okt" */
  title?: string
  color?: string
}

/**
 * A box with a heading – every chart of the page sits in one. No landmark of its own: the seven
 * sections are the landmarks, ~35 boxes as well would make that list useless.
 */
export function Card({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`${styles.card} ${wide ? styles.wide : ''}`}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {children}
    </div>
  )
}

/** One big number: "1’234 Aufträge" with a small line below */
export function StatTile({ icon: Icon, value, label, hint }: { icon: LucideIcon; value: string; label: string; hint?: string }) {
  return (
    <div className={styles.tile}>
      <Icon className={styles.tileIcon} aria-hidden />
      <span className={styles.tileValue}>{value}</span>
      <span className={styles.tileLabel}>{label}</span>
      {hint && <span className={styles.tileHint}>{hint}</span>}
    </div>
  )
}

/** Nothing counted yet – said in words instead of an empty box */
export function Empty({ children = 'Noch keine Daten' }: { children?: ReactNode }) {
  return <p className={`muted ${styles.empty}`}>{children}</p>
}

/** A ranking: one bar per row, the longest = the most. The numbers stand next to the bars. */
export function BarList({ rows, empty }: { rows: Bar[]; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>
  const max = Math.max(...rows.map((row) => row.count), 1)
  return (
    <ol className={styles.barList}>
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`} className={styles.barRow} title={row.title ?? row.label}>
          <span className={styles.barLabel}>{row.label}</span>
          <span className={styles.barTrack} aria-hidden>
            <span className={styles.barFill} style={{ inlineSize: `${(row.count / max) * 100}%`, background: row.color }} />
          </span>
          <span className={styles.barCount}>{formatCount(row.count)}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Columns side by side (months, weekdays, hours). The highest column is marked; every column
 * says its number in the tooltip and to screen readers.
 */
export function ColumnChart({ columns, unit }: { columns: Bar[]; unit: [string, string] }) {
  if (columns.every((column) => column.count === 0)) return <Empty />
  const max = Math.max(...columns.map((column) => column.count), 1)
  return (
    <ol className={styles.columns} style={{ '--columns': columns.length } as CSSProperties}>
      {columns.map((column) => {
        const text = `${column.title ?? column.label}: ${formatCount(column.count)} ${column.count === 1 ? unit[0] : unit[1]}`
        return (
          <li key={column.label} className={styles.column} title={text}>
            <span className={styles.columnCount} aria-hidden>
              {column.count > 0 ? formatCount(column.count) : ''}
            </span>
            <span className={styles.columnTrack} aria-hidden>
              <span
                className={`${styles.columnFill} ${column.count === max ? styles.columnTop : ''}`}
                style={{ blockSize: `${(column.count / max) * 100}%` }}
              />
            </span>
            <span className={styles.columnLabel} aria-hidden>
              {column.label}
            </span>
            <span className="visually-hidden">{text}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** The parts of a whole as one striped bar with a legend in percent; `format` e.g. for half days */
export function ShareBar({ parts, format = formatCount }: { parts: Bar[]; format?: (count: number) => string }) {
  const total = parts.reduce((sum, part) => sum + part.count, 0)
  if (total === 0) return <Empty />
  const colored = parts.filter((part) => part.count > 0).map((part, index) => ({ ...part, color: part.color ?? PALETTE[index % PALETTE.length] }))
  return (
    <div className={styles.share}>
      <div className={styles.shareBar} aria-hidden>
        {colored.map((part) => (
          <span key={part.label} style={{ flexGrow: part.count, background: part.color }} title={part.label} />
        ))}
      </div>
      <ul className={styles.legend}>
        {colored.map((part) => (
          <li key={part.label}>
            <span className={styles.swatch} style={{ background: part.color }} aria-hidden />
            <span>{part.label}</span>
            <span className={styles.legendCount}>
              {format(part.count)} · {formatPercent(part.count, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
