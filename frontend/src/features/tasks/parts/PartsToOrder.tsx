import { ClipboardList, PackageCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { reasonOf } from '../../../api/errors'
import { Button } from '../../../components/ui/Button'
import { useToast } from '../../../components/ui/toastContext'
import { useChangePartsStatus, usePartsToOrder, type AnyTask } from '../taskApi'
import styles from './PartsToOrder.module.css'
import { whenLabel } from '../taskTime'

/**
 * The material still to be ordered for tasks, on the shopping list (12c). Not copies as to-dos:
 * it IS the parts order of the task – "Bestellt" sets its status, and it is gone here (bug #2
 * and #10 of the old app were two lists of the same thing).
 */
export function PartsToOrder({ canEdit }: { canEdit: boolean }) {
  const { data: tasks, error } = usePartsToOrder()
  const change = useChangePartsStatus()
  const toast = useToast()
  const navigate = useNavigate()

  if (error) return <p className="muted">Material der Aufträge konnte nicht geladen werden: {error.message}</p>
  // nothing to order = no empty box above the shopping list
  if (!tasks || tasks.length === 0) return null

  function ordered(task: AnyTask) {
    change.mutate(
      { id: task.id, status: 'ORDERED' },
      {
        onSuccess: () => toast.success(`Material für ${task.customer.displayName} als bestellt eingetragen`),
        onError: (e) => toast.error(`Nicht gespeichert: ${reasonOf(e)}`),
      },
    )
  }

  return (
    <section className={styles.card} aria-label="Material für Aufträge">
      <h2 className={styles.title}>Material für Aufträge</h2>
      <ul className={styles.list}>
        {tasks.map((task) => (
          <li key={task.id} className={styles.item}>
            <span className={styles.text}>
              {task.parts?.description}
              {task.parts?.supplier && <span className="muted"> · {task.parts.supplier}</span>}
            </span>
            <button type="button" className={styles.task} onClick={() => navigate(`/tasks/${task.id}`)}>
              <ClipboardList aria-hidden />
              {task.customer.displayName}, {whenLabel(task)}
              {task.vehicle?.licensePlate && ` · ${task.vehicle.licensePlate}`}
            </button>
            {canEdit && (
              <span className={styles.action}>
                <Button small icon={PackageCheck} onClick={() => ordered(task)} disabled={change.isPending}>
                  Bestellt
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
