import { useCallback, useState, type ReactNode } from 'react'
import { BestaetigungKontext, type BestaetigungOptionen } from './bestaetigungKontext'
import { Button } from './Button'
import { Modal } from './Modal'

interface OffeneFrage extends BestaetigungOptionen {
  antworten: (ergebnis: boolean) => void
}

/**
 * Stellt `useBestaetigung()` bereit. Zeigt jeweils eine Rückfrage als Dialog.
 * Die Frage wird als Promise beantwortet: true = bestätigt, false = abgebrochen.
 */
export function BestaetigungProvider({ children }: { children: ReactNode }) {
  const [frage, setFrage] = useState<OffeneFrage | null>(null)

  const bestaetige = useCallback(
    (optionen: BestaetigungOptionen) =>
      new Promise<boolean>((resolve) => {
        setFrage({ ...optionen, antworten: resolve })
      }),
    [],
  )

  function beantworten(ergebnis: boolean) {
    frage?.antworten(ergebnis)
    setFrage(null)
  }

  return (
    <BestaetigungKontext.Provider value={bestaetige}>
      {children}
      <Modal
        offen={frage !== null}
        onSchliessen={() => beantworten(false)}
        titel={frage?.titel ?? ''}
        fuss={
          <>
            {/* Bei gefährlichen Aktionen liegt der Fokus auf "Abbrechen" – ein versehentliches
                Enter löscht dann nichts. */}
            <Button onClick={() => beantworten(false)} autoFocus={frage?.gefaehrlich}>
              Abbrechen
            </Button>
            <Button
              variante={frage?.gefaehrlich ? 'gefahr' : 'primaer'}
              onClick={() => beantworten(true)}
              autoFocus={!frage?.gefaehrlich}
            >
              {frage?.bestaetigenText ?? 'Bestätigen'}
            </Button>
          </>
        }
      >
        <p>{frage?.text}</p>
      </Modal>
    </BestaetigungKontext.Provider>
  )
}
