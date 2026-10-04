import { formatCount } from '../../lib/format'
import { countsText } from './importCounts'
import styles from './ImportResult.module.css'
import type { ImportRun } from './swissGarageApi'

/** This many problems are shown directly, the rest behind "show all". */
const VISIBLE_PROBLEMS = 5

/** Result of one import: the counts and the problems the import found. */
export function ImportResult({ run }: { run: ImportRun }) {
  const visible = run.problems.slice(0, VISIBLE_PROBLEMS)
  const hidden = run.problems.slice(VISIBLE_PROBLEMS)

  return (
    <div className={styles.result}>
      <p className={styles.counts}>
        {formatCount(run.rowsRead)} Zeilen gelesen: {countsText(run)}
      </p>
      {run.problems.length > 0 && (
        <div className={styles.problems}>
          <p className={styles.problemsTitle}>
            {run.problems.length === 1 ? '1 Hinweis' : `${run.problems.length} Hinweise`}
          </p>
          <ul>
            {visible.map((problem, i) => (
              <li key={i}>{problem}</li>
            ))}
          </ul>
          {hidden.length > 0 && (
            <details>
              <summary>alle {run.problems.length} anzeigen</summary>
              <ul>
                {hidden.map((problem, i) => (
                  <li key={i}>{problem}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
