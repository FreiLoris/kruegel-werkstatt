import { RotateCcw } from 'lucide-react'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { useInactiveCustomers, useSetCustomerActive } from './customerApi'
import styles from './CustomerSettings.module.css'

/**
 * Walk-in customers no longer used (E12): they no longer appear in the search – here they can be used
 * again. SwissGarage customers follow the import.
 */
export function InactiveCustomers() {
  const canEdit = useCanEdit()
  const toast = useToast()
  const { data: inactive } = useInactiveCustomers()
  const setActive = useSetCustomerActive()

  if (!inactive || inactive.length === 0) return null

  function reactivate(id: string, name: string) {
    setActive.mutate(
      { id, active: true },
      {
        onSuccess: () => toast.success(`${name} wird wieder verwendet`),
        onError: (error) => toast.error(`${name} konnte nicht aktiviert werden: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <details className={styles.inactive}>
      <summary>Eigene Kunden, nicht mehr verwendet ({inactive.length})</summary>
      <ul className={styles.inactiveList}>
        {inactive.map((customer) => (
          <li key={customer.id}>
            <span className="muted">{customer.displayName}</span>
            {canEdit && (
              <Button small icon={RotateCcw} onClick={() => reactivate(customer.id, customer.displayName)} disabled={setActive.isPending}>
                Wieder verwenden
              </Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
