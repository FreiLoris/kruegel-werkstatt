import { Pencil, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { InsuranceDialog } from './InsuranceDialog'
import styles from './InsuranceSettings.module.css'
import { useInsurances, useSetInsuranceActive, type Insurance } from './insuranceApi'

type Dialog = { kind: 'new' } | { kind: 'edit'; insurance: Insurance } | null

/**
 * Manage the insurances (FB-06): chosen in an insurance case, printed with their phone number on the
 * task sheet. Sorted by name; no longer used ones are deactivated – old tasks still name them.
 */
export function InsuranceSettings() {
  const { data: all, error, isPending, refetch } = useInsurances()
  const canEdit = useCanEdit()
  const setActive = useSetInsuranceActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="muted">Lade Versicherungen …</p>
  if (error) {
    return (
      <>
        <p className="muted">Versicherungen konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const active = all.filter((i) => i.active)
  const inactive = all.filter((i) => !i.active)

  function reactivate(insurance: Insurance) {
    setActive.mutate(
      { id: insurance.id, active: true },
      {
        onSuccess: () => toast.success(`${insurance.name} wird wieder verwendet`),
        onError: (error) => toast.error(`${insurance.name} konnte nicht aktiviert werden: ${error.message}`),
      },
    )
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Versicherungen</h2>
          <p className="muted">Für Versicherungsfälle im Auftrag. Name und Telefon stehen auf dem Auftragszettel.</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Versicherung hinzufügen
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>Noch keine Versicherungen erfasst.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Telefon</th>
                <th>E-Mail</th>
                {canEdit && (
                  <th>
                    <span className={styles.srOnly}>Aktionen</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {active.map((insurance) => (
                <tr key={insurance.id}>
                  <td className={styles.name}>{insurance.name}</td>
                  <td>{insurance.phone ?? <span className="muted">–</span>}</td>
                  <td>{insurance.email ?? <span className="muted">–</span>}</td>
                  {canEdit && (
                    <td className={styles.actions}>
                      <Button icon={Pencil} onClick={() => setDialog({ kind: 'edit', insurance })} aria-label={`${insurance.name} bearbeiten`}>
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
          <summary>Nicht mehr verwendet ({inactive.length})</summary>
          <ul className={styles.inactiveList}>
            {inactive.map((insurance) => (
              <li key={insurance.id}>
                <span className="muted">{insurance.name}</span>
                {canEdit && (
                  <Button small icon={RotateCcw} onClick={() => reactivate(insurance)} disabled={setActive.isPending}>
                    Wieder verwenden
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && (
        <InsuranceDialog
          key={dialog.kind === 'new' ? 'new' : dialog.insurance.id}
          insurance={dialog.kind === 'edit' ? dialog.insurance : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
