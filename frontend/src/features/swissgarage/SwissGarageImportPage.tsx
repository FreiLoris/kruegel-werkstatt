import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { formatCount } from '../../lib/format'
import { ImportCard } from './ImportCard'
import { ImportedDataSearch } from './ImportedDataSearch'
import { ImportLog } from './ImportLog'
import styles from './SwissGarageImportPage.module.css'
import { useImportRuns, useSwissGarageStatus, type ImportKind } from './swissGarageApi'

/**
 * SwissGarage import: customers and vehicles are maintained in SwissGarage and brought into
 * the app with its two Excel exports (ADR 0003). Each import updates, adds and deactivates –
 * nothing is deleted, so later orders keep their customer.
 */
export function SwissGarageImportPage() {
  const runs = useImportRuns()
  const status = useSwissGarageStatus()
  const canEdit = useCanEdit()

  const lastRun = (kind: ImportKind) => runs.data?.find((run) => run.kind === kind)

  return (
    <>
      <h1>SwissGarage-Import</h1>
      <p className={`muted ${styles.intro}`}>
        Kunden und Fahrzeuge werden in SwissGarage gepflegt. Hier die beiden Exporte hochladen – zuerst die Adressliste,
        dann die Fahrzeugliste (Fahrzeuge werden über die Adressnummer ihrem Halter zugeordnet). Neue Einträge kommen dazu,
        geänderte werden aktualisiert, fehlende deaktiviert.
      </p>

      {status.data && (
        <p className={styles.status}>
          <strong>{formatCount(status.data.customers)}</strong> Kunden ·{' '}
          <strong>{formatCount(status.data.vehicles)}</strong> Fahrzeuge aus SwissGarage
          {status.data.vehiclesWithoutHolder > 0 && (
            <span className="muted"> (davon {formatCount(status.data.vehiclesWithoutHolder)} ohne bekannten Halter)</span>
          )}
        </p>
      )}

      {runs.error ? (
        <>
          <p className="muted">Import-Protokoll konnte nicht geladen werden: {runs.error.message}</p>
          <Button onClick={() => void runs.refetch()}>Erneut versuchen</Button>
        </>
      ) : (
        <div className={styles.cards}>
          <ImportCard kind="CUSTOMERS" lastRun={lastRun('CUSTOMERS')} canEdit={canEdit} />
          <ImportCard kind="VEHICLES" lastRun={lastRun('VEHICLES')} canEdit={canEdit} />
        </div>
      )}

      <section className={styles.section}>
        <h2>Daten ansehen</h2>
        <ImportedDataSearch />
      </section>

      <section className={styles.section}>
        <h2>Protokoll</h2>
        {runs.isPending ? <p className="muted">Lade Protokoll …</p> : runs.data && <ImportLog runs={runs.data} />}
      </section>
    </>
  )
}
