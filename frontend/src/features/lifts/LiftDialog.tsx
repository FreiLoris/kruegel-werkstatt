import { useId, useState, type FormEvent } from 'react'
import { ApiFehler } from '../../api/fehler'
import { Button } from '../../components/ui/Button'
import { Textfeld } from '../../components/ui/Felder'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastKontext'
import { useLiftSpeichern, type Lift } from './liftApi'

/** Lift anlegen (ohne `lift`) oder umbenennen. Wird beim Öffnen neu eingesetzt (`key`). */
export function LiftDialog({ lift, onSchliessen }: { lift?: Lift; onSchliessen: () => void }) {
  const formularId = useId()
  const toast = useToast()
  const speichern = useLiftSpeichern()
  const [name, setName] = useState(lift?.name ?? '')

  const feldfehler = speichern.error instanceof ApiFehler ? speichern.error.meldungFuerFeld('name') : undefined

  function absenden(event: FormEvent) {
    event.preventDefault()
    speichern.mutate(
      { id: lift?.id, name, version: lift?.version },
      {
        onSuccess: (gespeichert) => {
          toast.erfolg(`${gespeichert.name} gespeichert`)
          onSchliessen()
        },
        onError: (fehler) => {
          if (fehler instanceof ApiFehler && fehler.istKonflikt) {
            toast.fehler(`${lift?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onSchliessen()
          } else if (!(fehler instanceof ApiFehler && fehler.meldungFuerFeld('name'))) {
            toast.fehler(`Speichern fehlgeschlagen: ${fehler.message}`)
          }
        },
      },
    )
  }

  return (
    <Modal
      offen
      onSchliessen={onSchliessen}
      titel={lift ? `${lift.name} umbenennen` : 'Neuer Lift'}
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button variante="primaer" type="submit" form={formularId} laedt={speichern.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formularId} onSubmit={absenden}>
        <Textfeld
          label="Name"
          pflicht
          autoFocus
          placeholder="z. B. Lift 4 oder Grube"
          hinweis="So heisst die Spalte in Tagesansicht und Dashboard."
          maxLength={30}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (speichern.error) speichern.reset()
          }}
          fehler={feldfehler}
        />
      </form>
    </Modal>
  )
}
