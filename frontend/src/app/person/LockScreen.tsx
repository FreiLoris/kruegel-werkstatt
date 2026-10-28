import { useEffect, useRef } from 'react'
import type { Employee } from '../../features/employees/employeeApi'
import styles from './LockScreen.module.css'
import { PersonChoices } from './PersonPicker'

/**
 * After some minutes without use (FB-29): who is at the device now? Over the page, which stays as
 * it is underneath – a half-typed task is still there. One tap on a name, no password (decided by
 * the workshop).
 */
export function LockScreen({ active, onChosen }: { active: Employee[]; onChosen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    // modal: the page underneath can neither be reached with the keyboard nor read out
    // (not there in the test browser – the content is shown anyway)
    dialog.current?.showModal?.()
  }, [])

  return (
    <dialog
      ref={dialog}
      className={styles.lock}
      aria-labelledby="lock-title"
      // Escape must not just close it – a name has to be chosen
      onCancel={(e) => e.preventDefault()}
    >
      <h1 id="lock-title">Wer ist am Gerät?</h1>
      <p className="muted">Eine Weile nichts bedient – bitte kurz antippen, wer jetzt arbeitet. Angefangene Eingaben bleiben erhalten.</p>
      <PersonChoices active={active} onChosen={onChosen} withViewOnly={false} />
    </dialog>
  )
}
