import { useState } from 'react'
import { Link } from 'react-router'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { PlaceMap } from './PlaceMap'
import { useMoveTireSet, useTireLocations, useTirePlaces, useTireSets, useTreadLimits, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'

/**
 * Moving a set onto another place – or giving one to a set without (e.g. taken over from
 * SwissGarage). A few clicks: tap a free place, save. Kept in the history.
 */
export function MoveDialog({ set, onClose }: { set: TireSet; onClose: () => void }) {
  const { data: locations } = useTireLocations()
  const { data: places } = useTirePlaces()
  const { data: sets } = useTireSets(true)
  const { data: limits } = useTreadLimits()
  const move = useMoveTireSet()
  const toast = useToast()
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const chosen = places?.find((p) => p.id === placeId)

  function save() {
    if (!placeId) return
    move.mutate(
      { id: set.id, placeId, note: note.trim() || undefined },
      {
        onSuccess: (moved) => {
          toast.success(`Satz von ${set.customer.displayName} liegt jetzt auf ${moved.place}`)
          onClose()
        },
        onError: (error) => toast.error(`Nicht umgelagert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={set.place ? `Umlagern – bisher ${set.place}` : 'Lagerplatz zuweisen'}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!placeId} loading={move.isPending} onClick={save}>
            {chosen ? `Auf ${chosen.address}` : 'Platz wählen'}
          </Button>
        </>
      }
    >
      <div className={styles.section}>
        {!locations || !places || !sets ? (
          <p className="muted">Lade Plätze …</p>
        ) : locations.length === 0 ? (
          <p className="muted">
            Noch keine Standorte – in den <Link to="/settings">Einstellungen</Link> unter «Pneuhotel – Standorte» anlegen.
          </p>
        ) : (
          <PlaceMap
            locations={locations}
            places={places}
            sets={sets}
            limits={limits}
            mode="pick"
            selected={placeId ?? set.placeId}
            currentSetId={set.id}
            onPick={(place) => setPlaceId(place.id)}
          />
        )}
        <TextField label="Notiz" placeholder="z. B. Platz für Kompletträder frei gemacht" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  )
}
