import { Pencil, Plus, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { formatDuration } from '../../lib/format'
import { InspectionStationDialog } from './InspectionStationDialog'
import styles from './InspectionStationSettings.module.css'
import { useInspectionStations, useMakeStandardStation, useSetInspectionStationActive, type InspectionStation } from './inspectionStationApi'

type Dialog = { kind: 'new' } | { kind: 'edit'; station: InspectionStation } | null

/**
 * Manage the inspection stations (FB-10): where a car goes for its MFK. The standard is preset on a
 * new task – nearly every inspection is there; its duration is preset as the MFK appointment's.
 * No longer used ones are deactivated – old tasks still name them.
 */
export function InspectionStationSettings() {
  const { data: all, error, isPending, refetch } = useInspectionStations()
  const canEdit = useCanEdit()
  const makeStandard = useMakeStandardStation()
  const setActive = useSetInspectionStationActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="muted">Lade Prüfstellen …</p>
  if (error) {
    return (
      <>
        <p className="muted">Prüfstellen konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const active = all.filter((s) => s.active)
  const inactive = all.filter((s) => !s.active)

  function standard(station: InspectionStation) {
    makeStandard.mutate(station.id, {
      onSuccess: () => toast.success(`${station.name} ist jetzt der Standard`),
      onError: (error) => toast.error(`${station.name}: ${error.message}`),
    })
  }

  function reactivate(station: InspectionStation) {
    setActive.mutate(
      { id: station.id, active: true },
      {
        onSuccess: () => toast.success(`${station.name} wird wieder verwendet`),
        onError: (error) => toast.error(`${station.name} konnte nicht aktiviert werden: ${error.message}`),
      },
    )
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Prüfstellen</h2>
          <p className="muted">Wo die MFK stattfindet. Der Standard ist bei jedem neuen Auftrag mit MFK vorgewählt.</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Prüfstelle hinzufügen
          </Button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              {/* one column: the settings are narrow, the actions must stay visible */}
              <th>Adresse, Telefon</th>
              <th>Dauer inkl. Fahrt</th>
              {canEdit && (
                <th>
                  <span className={styles.srOnly}>Aktionen</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {active.map((station) => (
              <tr key={station.id}>
                <td className={`${styles.name} ${styles.wrap}`}>
                  {station.name}
                  {station.standard && <span className={styles.standard}>Standard</span>}
                </td>
                <td className={styles.wrap}>
                  {station.address || station.phone ? (
                    [station.address, station.phone].filter(Boolean).join(' · ')
                  ) : (
                    <span className="muted">–</span>
                  )}
                </td>
                <td>{formatDuration(station.minutes)}</td>
                {canEdit && (
                  <td className={styles.actions}>
                    {!station.standard && (
                      <Button small icon={Star} onClick={() => standard(station)} disabled={makeStandard.isPending}>
                        Als Standard
                      </Button>
                    )}
                    <Button small icon={Pencil} onClick={() => setDialog({ kind: 'edit', station })} aria-label={`${station.name} bearbeiten`}>
                      Bearbeiten
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inactive.length > 0 && (
        <details className={styles.inactive}>
          <summary>Nicht mehr verwendet ({inactive.length})</summary>
          <ul className={styles.inactiveList}>
            {inactive.map((station) => (
              <li key={station.id}>
                <span className="muted">{station.name}</span>
                {canEdit && (
                  <Button small icon={RotateCcw} onClick={() => reactivate(station)} disabled={setActive.isPending}>
                    Wieder verwenden
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && (
        <InspectionStationDialog
          key={dialog.kind === 'new' ? 'new' : dialog.station.id}
          station={dialog.kind === 'edit' ? dialog.station : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
