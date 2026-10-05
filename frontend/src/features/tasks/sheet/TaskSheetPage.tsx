import { ArrowLeft, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { useCompany } from '../../company/companyApi'
import { useAllEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { useTask } from '../taskApi'
import { TaskSheet } from './TaskSheet'
import styles from './TaskSheetPage.module.css'

/**
 * Print view of a task sheet – outside the app frame, so only the paper is printed.
 * On screen: grey desk with the white A4 sheet and a toolbar (hidden when printing).
 */
export function TaskSheetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const task = useTask(id)
  const company = useCompany()
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  const error = task.error ?? company.error
  const ready = task.data && company.data && serviceItems

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/')}>
          Zur App
        </Button>
        <Button variant="primary" icon={Printer} disabled={!ready} onClick={() => window.print()}>
          Drucken
        </Button>
      </div>
      {error ? (
        <p className={styles.message}>Auftrag konnte nicht geladen werden: {error.message}</p>
      ) : !ready ? (
        <p className={styles.message}>Lade Auftragszettel …</p>
      ) : (
        <TaskSheet
          task={task.data}
          company={company.data}
          lookups={{
            serviceItemNames,
            mechanicName: employees?.find((e) => e.id === task.data.mechanicId)?.name,
            liftName: lifts?.find((l) => l.id === task.data.liftId)?.name,
          }}
        />
      )}
    </div>
  )
}
