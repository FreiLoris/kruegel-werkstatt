import { ABSENCE_CATEGORY, type AbsenceCategory } from './absenceApi'
import styles from './AbsenceChip.module.css'
import { partLabel, type AbsenceOnDay } from './absenceDays'

const CATEGORY_CLASS: Record<AbsenceCategory, string> = {
  VACATION: styles.vacation,
  SICK: styles.sick,
  EXTERNAL_WORK: styles.external,
  TRAINING: styles.training,
}

/**
 * Who is away on a day, small: "Reto · Ferien", with "Vormittag"/"Nachmittag" for half days and
 * the company for external work. Color AND text – not color alone.
 */
export function AbsenceChip({ day, name }: { day: AbsenceOnDay; name: string }) {
  const { absence, part } = day
  const what = absence.category === 'EXTERNAL_WORK' && absence.company ? `${ABSENCE_CATEGORY.EXTERNAL_WORK} ${absence.company}` : ABSENCE_CATEGORY[absence.category]
  const half = partLabel(part)
  // the chip is cut off in narrow day columns – the tooltip always has everything
  const full = [`${name} · ${what}${half ? ` (${half})` : ''}`, absence.note].filter(Boolean).join('\n')
  return (
    <span className={[styles.chip, CATEGORY_CLASS[absence.category]].join(' ')} title={full}>
      <strong>{name}</strong> · {what}
      {half && <span className={styles.half}> ({half})</span>}
    </span>
  )
}
