import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { PlaceMap } from './PlaceMap'
import { SEASONS, useMoveTireSet, useTireLocations, useTirePlaces, useTireSets, useTreadLimits, type TireSet } from './tireHotelApi'
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
  const navigate = useNavigate()
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const chosen = places?.find((p) => p.id === placeId)

  function save() {
    if (!placeId) return
    move.mutate(
      { id: set.id, placeId, note: note.trim() || undefined },
      {
        onSuccess: (moved) => {
          // the labels on the tyres still name the old place (UX G-17)
          toast.success(`Satz von ${set.customer.displayName} liegt jetzt auf ${moved.place} – neue Etiketten drucken`, {
            label: 'Etiketten',
            onClick: () => navigate(`/tires/${set.id}/labels`),
          })
          onClose()
        },
        onError: (error) => {
          // e.g. taken on another device just now – choose again
          setPlaceId(null)
          toast.error(`Nicht umgelagert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      // which set – the dialog lies over the list (UX M-20)
      title={`${set.place ? `Umlagern – bisher ${set.place}` : 'Lagerplatz zuweisen'} · ${set.customer.displayName}${set.vehicle?.licensePlate ? `, ${set.vehicle.licensePlate}` : ''}, ${SEASONS[set.season]}`}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!placeId} loading={move.isPending} onClick={save}>
            {chosen ? `Auf ${chosen.address}` : 'Platz wählen'}
          </Button>
        </>
      }
    >
      <div className={styles.dialogBody}>
        {!locations || !places || !sets ? (
          <p className="muted">Lade Plätze …</p>
        ) : locations.length === 0 ? (
          <p className="muted">
            Noch keine Standorte – in den <Link to="/settings#pneuhotel-standorte">Einstellungen</Link> unter «Pneuhotel – Standorte» anlegen.
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
