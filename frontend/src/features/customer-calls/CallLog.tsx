import { X } from 'lucide-react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { useAllEmployees } from '../employees/employeeApi'
import styles from './CallLog.module.css'
import { callText } from './callText'
import { OUTCOMES, useDeleteCall, useNoteCall, type CallOutcome, type CustomerCall } from './customerCallApi'

/**
 * Next to the phone number (FB-16, FB-21): the latest call to the customer – and one tap to note
 * how this one went, so two people do not call twice. A call tapped by mistake goes with ✕.
 */
export function CallLog({ customerId, latest, canEdit }: { customerId: string; latest: CustomerCall | undefined; canEdit: boolean }) {
  const toast = useToast()
  const { data: employees } = useAllEmployees()
  const note = useNoteCall()
  const remove = useDeleteCall()
  const nameOf = (id: string) => employees?.find((e) => e.id === id)?.name

  const noteCall = (outcome: CallOutcome) =>
    note.mutate({ customerId, outcome }, { onError: (error) => toast.error(`Anruf nicht vermerkt: ${reasonOf(error)}`) })

  return (
    <span className={styles.log}>
      {latest && (
        <span className={styles.latest}>
          {callText(latest, nameOf)}
          {canEdit && (
            <button
              type="button"
              className={styles.remove}
              aria-label="Anruf löschen (versehentlich vermerkt)"
              title="Versehentlich vermerkt – löschen"
              disabled={remove.isPending}
              onClick={() => remove.mutate(latest.id, { onError: (error) => toast.error(`Nicht gelöscht: ${reasonOf(error)}`) })}
            >
              <X aria-hidden />
            </button>
          )}
        </span>
      )}
      {canEdit && (
        <span className={styles.buttons} role="group" aria-label="Anruf vermerken">
          {(Object.keys(OUTCOMES) as CallOutcome[]).map((outcome) => (
            <Button key={outcome} small variant="secondary" disabled={note.isPending} onClick={() => noteCall(outcome)}>
              {OUTCOMES[outcome]}
            </Button>
          ))}
        </span>
      )}
    </span>
  )
}
