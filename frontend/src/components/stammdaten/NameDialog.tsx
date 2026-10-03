import { useId, useState, type FormEvent } from 'react'
import { ApiFehler } from '../../api/fehler'
import { Button } from '../ui/Button'
import { Textfeld } from '../ui/Felder'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toastKontext'

interface NameDialogProps {
  titel: string
  /** Bisheriger Name beim Umbenennen, leer beim Anlegen */
  startName?: string
  placeholder: string
  hinweis: string
  maxLength: number
  /** Speichert und liefert den gespeicherten Eintrag – wirft bei Fehlern (z. B. `mutateAsync`) */
  speichern: (name: string) => Promise<{ name: string }>
  onSchliessen: () => void
}

/**
 * Dialog mit einem einzigen Feld «Name» – für Stammdaten wie Lifts oder Serviceleistungen.
 * Feldfehler (Name schon vergeben) erscheinen beim Feld, alles andere als Meldung.
 * Wird beim Öffnen neu eingesetzt (`key`), damit kein alter Text stehen bleibt.
 */
export function NameDialog({ titel, startName = '', placeholder, hinweis, maxLength, speichern, onSchliessen }: NameDialogProps) {
  const formularId = useId()
  const toast = useToast()
  const [name, setName] = useState(startName)
  const [feldfehler, setFeldfehler] = useState<string>()
  const [laedt, setLaedt] = useState(false)

  async function absenden(event: FormEvent) {
    event.preventDefault()
    setLaedt(true)
    try {
      const gespeichert = await speichern(name)
      toast.erfolg(`${gespeichert.name} gespeichert`)
      onSchliessen()
    } catch (fehler) {
      const meldung = fehler instanceof ApiFehler ? fehler.meldungFuerFeld('name') : undefined
      if (fehler instanceof ApiFehler && fehler.istKonflikt) {
        toast.fehler(`${startName} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
        onSchliessen()
      } else if (meldung) {
        setFeldfehler(meldung)
      } else {
        toast.fehler(`Speichern fehlgeschlagen: ${fehler instanceof Error ? fehler.message : String(fehler)}`)
      }
    } finally {
      setLaedt(false)
    }
  }

  return (
    <Modal
      offen
      onSchliessen={onSchliessen}
      titel={titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button variante="primaer" type="submit" form={formularId} laedt={laedt}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formularId} onSubmit={(e) => void absenden(e)}>
        <Textfeld
          label="Name"
          pflicht
          autoFocus
          placeholder={placeholder}
          hinweis={hinweis}
          maxLength={maxLength}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setFeldfehler(undefined)
          }}
          fehler={feldfehler}
        />
      </form>
    </Modal>
  )
}
