import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { moved } from '../../lib/sortOrder'
import { CourtesyCarDialog } from './CourtesyCarDialog'
import styles from './CourtesyCarSettings.module.css'
import { useAllCourtesyCars, useReorderCourtesyCars, useSetCourtesyCarActive, type CourtesyCar } from './courtesyCarApi'
import { DueDate } from './DueDate'

type Dialog = { kind: 'new' } | { kind: 'edit'; car: CourtesyCar } | null

/**
 * Manage the courtesy cars (Ersatzwagen) – master data only; bookings follow in phase 7.
 * Service and insurance dates are shown with a warning when they are due soon or overdue.
 */
export function CourtesyCarSettings() {
  const { data: all, error, isPending, refetch } = useAllCourtesyCars()
  const canEdit = useCanEdit()
  const reorder = useReorderCourtesyCars()
  const setActive = useSetCourtesyCarActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="muted">Lade Ersatzwagen …</p>
  if (error) {
    return (
      <>
        <p className="muted">Ersatzwagen konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const active = all.filter((c) => c.active)
  const inactive = all.filter((c) => !c.active)

  function move(index: number, direction: -1 | 1) {
    reorder.mutate(moved(active.map((c) => c.id), index, direction), {
      onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`),
    })
  }

  function putBackIntoService(car: CourtesyCar) {
    setActive.mutate(
      { id: car.id, active: true },
      {
        onSuccess: () => toast.success(`${car.name} ist wieder in Betrieb`),
        // e.g. the license plate belongs to another car in the meantime
        onError: (error) => toast.error(`${car.name} konnte nicht aktiviert werden: ${error.message}`),
      },
    )
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Ersatzwagen</h2>
          <p className="muted">Fahrzeuge für Kunden während der Reparatur. Warnung, wenn Service oder Versicherung bald fällig sind.</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Ersatzwagen hinzufügen
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>Noch keine Ersatzwagen erfasst.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bezeichnung</th>
                <th>Kennzeichen</th>
                <th>Service fällig</th>
                <th>Versicherung bis</th>
                {canEdit && (
                  <th>
                    <span className={styles.srOnly}>Aktionen</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {active.map((car, index) => (
                <tr key={car.id}>
                  <td>
                    <div className={styles.name}>{car.name}</div>
                    {car.model && <div className="muted">{car.model}</div>}
                  </td>
                  <td>{car.licensePlate ? <LicensePlate text={car.licensePlate} size="sm" /> : <span className="muted">–</span>}</td>
                  <td>
                    <DueDate date={car.serviceDue} status={car.serviceStatus} kind="service" />
                  </td>
                  <td>
                    <DueDate date={car.insuranceUntil} status={car.insuranceStatus} kind="insurance" />
                  </td>
                  {canEdit && (
                    <td className={styles.actions}>
                      <Button
                        variant="ghost"
                        icon={ArrowUp}
                        aria-label={`${car.name} nach oben`}
                        title="Nach oben"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      />
                      <Button
                        variant="ghost"
                        icon={ArrowDown}
                        aria-label={`${car.name} nach unten`}
                        title="Nach unten"
                        disabled={index === active.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      />
                      <Button icon={Pencil} onClick={() => setDialog({ kind: 'edit', car })} aria-label={`${car.name} bearbeiten`}>
                        Bearbeiten
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inactive.length > 0 && (
        <details className={styles.inactive}>
          <summary>Ausser Betrieb ({inactive.length})</summary>
          <ul className={styles.inactiveList}>
            {inactive.map((car) => (
              <li key={car.id}>
                <span className="muted">
                  {car.name}
                  {car.licensePlate && ` · ${car.licensePlate}`}
                </span>
                {canEdit && (
                  <Button small icon={RotateCcw} onClick={() => putBackIntoService(car)} disabled={setActive.isPending}>
                    Wieder in Betrieb
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && (
        <CourtesyCarDialog
          key={dialog.kind === 'new' ? 'new' : dialog.car.id}
          car={dialog.kind === 'edit' ? dialog.car : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
