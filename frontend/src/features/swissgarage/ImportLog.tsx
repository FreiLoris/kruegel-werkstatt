import { formatTimestamp } from '../../lib/format'
import { NameBadge } from '../employees/NameBadge'
import { useAllEmployees } from '../employees/employeeApi'
import styles from './ImportLog.module.css'
import { countsText } from './importCounts'
import { IMPORT_FILES, type ImportRun } from './swissGarageApi'

/** The last 20 imports: when, what, who, result. Problems can be opened per row. */
export function ImportLog({ runs }: { runs: ImportRun[] }) {
  const { data: employees } = useAllEmployees()

  if (runs.length === 0) {
    return <p className="muted">Noch keine Importe.</p>
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Zeitpunkt</th>
            <th>Liste</th>
            <th>Datei</th>
            <th>Wer</th>
            <th>Ergebnis</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const who = employees?.find((e) => e.id === run.importedBy)
            return (
              <tr key={run.id}>
                <td className={styles.nowrap}>{formatTimestamp(run.importedAt)}</td>
                <td>{IMPORT_FILES[run.kind].title}</td>
                <td>{run.fileName}</td>
                <td>{who ? <NameBadge name={who.name} color={who.color} /> : '–'}</td>
                <td>
                  {countsText(run)}
                  {run.problems.length > 0 && (
                    <details className={styles.problems}>
                      <summary>
                        {run.problems.length === 1 ? '1 Hinweis' : `${run.problems.length} Hinweise`}
                      </summary>
                      <ul>
                        {run.problems.map((problem, i) => (
                          <li key={i}>{problem}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
