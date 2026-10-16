import { useCallback, useRef, useState, type ReactNode } from 'react'
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
  // The open question also as a ref: a second confirm() must answer the first one,
  // otherwise its caller would wait forever
  const openQuestion = useRef<OpenQuestion | null>(null)

  const show = useCallback((next: OpenQuestion | null) => {
    openQuestion.current = next
    setQuestion(next)
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        openQuestion.current?.answer(false)
        show({ ...options, answer: resolve })
      }),
    [show],
  )

  function answer(result: boolean) {
    question?.answer(result)
    show(null)
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
              {question?.cancelLabel ?? 'Abbrechen'}
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
