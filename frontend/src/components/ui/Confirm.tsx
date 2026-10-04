import { useCallback, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { ConfirmContext, type ConfirmOptions } from './confirmContext'
import { Modal } from './Modal'

interface OpenQuestion extends ConfirmOptions {
  answer: (result: boolean) => void
}

/**
 * Provides `useConfirm()`. Shows one question at a time as a dialog.
 * The question is answered as a Promise: true = confirmed, false = cancelled.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [question, setQuestion] = useState<OpenQuestion | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setQuestion({ ...options, answer: resolve })
      }),
    [],
  )

  function answer(result: boolean) {
    question?.answer(result)
    setQuestion(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={question !== null}
        onClose={() => answer(false)}
        title={question?.title ?? ''}
        footer={
          <>
            {/* For dangerous actions the focus is on "Abbrechen" – an accidental Enter then
                deletes nothing. */}
            <Button onClick={() => answer(false)} data-autofocus={question?.dangerous || undefined}>
              Abbrechen
            </Button>
            <Button
              variant={question?.dangerous ? 'danger' : 'primary'}
              onClick={() => answer(true)}
              data-autofocus={!question?.dangerous || undefined}
            >
              {question?.confirmLabel ?? 'Bestätigen'}
            </Button>
          </>
        }
      >
        <p>{question?.text}</p>
      </Modal>
    </ConfirmContext.Provider>
  )
}
