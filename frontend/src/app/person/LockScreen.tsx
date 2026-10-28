import { useEffect, useRef } from 'react'
import type { Employee } from '../../features/employees/employeeApi'
import styles from './LockScreen.module.css'
import { PersonChoices } from './PersonPicker'

/**
 * After some minutes without use (FB-29): who is at the device now? Over the page, which stays as
 * it is underneath – a half-typed task is still there. One tap on a name, no password (decided by
 * the workshop). It cannot be closed any other way: Escape is ignored, and should the browser close
 * it anyway (Chromium lets a second Escape through), it opens again.
 */
export function LockScreen({ active, onChosen }: { active: Employee[]; onChosen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const element = dialog.current
    // modal: the page underneath can neither be reached with the keyboard nor read out
    // (not there in the test browser – the content is shown anyway)
    element?.showModal?.()
    // the heading first, not a name: a stray Enter must not choose someone
    title.current?.focus()
    // unlocked: the focus goes back to where it was (e.g. the half-typed field)
    return () => element?.close?.()
  }, [])

  return (
    <dialog
      ref={dialog}
      className={styles.lock}
      aria-labelledby="lock-title"
      // Escape and the browser's own closing must not just close it – a name has to be chosen
      {...{ closedby: 'none' }}
      onCancel={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.preventDefault()
      }}
      onClose={() => dialog.current?.showModal?.()}
    >
      <h1 id="lock-title" ref={title} tabIndex={-1}>
        Wer ist am Gerät?
      </h1>
      <p className="muted">Eine Weile nichts bedient – bitte kurz antippen, wer jetzt arbeitet. Angefangene Eingaben bleiben erhalten.</p>
      <PersonChoices active={active} onChosen={onChosen} withViewOnly={false} />
    </dialog>
  )
}
