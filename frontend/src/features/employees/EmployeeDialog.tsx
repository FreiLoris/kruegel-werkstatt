import { UserX } from 'lucide-react'
import { useId, useState } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatTimestamp } from '../../lib/format'
import styles from './EmployeeDialog.module.css'
import { useSaveEmployee, useSetEmployeeActive, type Employee } from './employeeApi'
import { EmployeeForm } from './EmployeeForm'
import { initialValues, toRequest, type FormValues } from './formValues'

interface EmployeeDialogProps {
  /** Empty = create a new person */
  employee?: Employee
  /** All persons – to show which colors are already taken */
  all: Employee[]
  onClose: () => void
}

/**
 * Create and edit in one dialog.
 *
 * Mounted fresh on every open (see `key` in the page) – so the form always starts with
 * the current values and nothing is left over from last time.
 */
export function EmployeeDialog({ employee, all, onClose }: EmployeeDialogProps) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveEmployee()
  const setActive = useSetEmployeeActive()

  const others = all.filter((e) => e.active && e.id !== employee?.id)
  const takenColors = new Map(others.map((e) => [e.color.toLowerCase(), e.name]))
  const [values, setValues] = useState(() => initialValues(employee, [...takenColors.keys()]))

  function change(newValues: FormValues) {
    setValues(newValues)
    // An old error message disappears as soon as something is corrected
    if (save.error) save.reset()
  }

  function submit() {
    save.mutate(
      { id: employee?.id, request: toRequest(values, employee?.version) },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`${employee?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!isFieldError(error)) {
            // Field errors appear at the field – everything else (server gone, 500) as a message
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function deactivate() {
    if (!employee) return
    const ok = await confirm({
      title: `${employee.name} deaktivieren?`,
      text:
        `${employee.name} erscheint danach in keiner Auswahl und auf keiner Pinnwand mehr. ` +
        'Bisherige Aufträge und Einträge behalten den Namen. Unter «Ehemalige» lässt sich das jederzeit rückgängig machen.',
      confirmLabel: 'Deaktivieren',
    })
    if (!ok) return
    setActive.mutate(
      { id: employee.id, active: false },
      {
        onSuccess: () => {
          toast.success(`${employee.name} deaktiviert`)
          onClose()
        },
        onError: (error) => toast.error(`Deaktivieren fehlgeschlagen: ${error.message}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={employee ? `${employee.name} bearbeiten` : 'Neuer Mitarbeiter'}
      footer={
        <>
          {employee?.active && (
            <Button variant="ghost" icon={UserX} onClick={deactivate} loading={setActive.isPending} className={styles.left}>
              Deaktivieren
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <EmployeeForm id={formId} values={values} onChange={change} onSubmit={submit} error={save.error} takenColors={takenColors} />
      {employee && <LastChanged employee={employee} all={all} />}
    </Modal>
  )
}

/** "Zuletzt geändert am … von …" – who changed something last? */
function LastChanged({ employee, all }: { employee: Employee; all: Employee[] }) {
  const by = all.find((e) => e.id === employee.updatedBy)?.name
  return (
    <p className={styles.lastChanged}>
      Zuletzt geändert {formatTimestamp(employee.updatedAt)}
      {by && ` von ${by}`}
    </p>
  )
}

function isFieldError(error: Error): boolean {
  return error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0
}
