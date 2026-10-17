import { ArrowLeft, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/errors'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../components/ui/StickyFooter'
import { useToast } from '../../components/ui/toastContext'
import { useToday } from '../../lib/clock'
import { useTask, type AnyTask } from '../tasks/taskApi'
import { PlaceMap } from './PlaceMap'
import { bookingErrors, hasErrors, initialBooking, isEmpty, setSummary, swapPlace, toBookingRequest, type BookingForm } from './taskTires'
import { useBookTaskTires, useTaskTires, useTireLocations, useTirePlaces, useTireSets, useTreadLimits, type TaskTires } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { TireSetFields } from './TireSetFields'
import { lastUsedPlace, nextFreePlace, occupancy } from './tirePlaces'
import { TreadDepthsInput } from './TreadDepthsInput'
import { scrollToFirstError } from '../../lib/scrollToFirstError'

/**
 * The tyre change of a task booked in the tyre hotel (13q) – once the wheels are changed, from the
 * task sheet: the set mounted leaves the hotel, the one taken off goes in, both with the depths
 * noted on the sheet. Proposed is the usual swap: the set of the hotel on, the one retrieved last
 * off and onto the place that just became free.
 */
export function TaskTireBookingPage() {
  const { id } = useParams()
  const task = useTask(id)
  const tires = useTaskTires(id)
  // the data wins: a failed background refetch (any tyre hotel change reloads it) keeps the depths typed here
  if (!task.data || !tires.data) {
    const error = (!task.data && task.error) || (!tires.data && tires.error)
    return <p className="muted">{error ? `Konnte nicht geladen werden: ${error.message}` : 'Lade …'}</p>
  }
  return <Booking task={task.data} tires={tires.data} />
}

function Booking({ task, tires }: { task: AnyTask; tires: TaskTires }) {
  const navigate = useNavigate()
  const today = useToday()
  const toast = useToast()
  const fromHotel = task.tireChangeKind === 'WHEELS_STORED' || task.tireChangeKind === 'TIRES_STORED'
  const [form, setForm] = useState<BookingForm>(() => initialBooking(tires, fromHotel, today))
  const [showRequired, setShowRequired] = useState(false)
  const { data: limits } = useTreadLimits()
  const { data: locations } = useTireLocations()
  const { data: places } = useTirePlaces()
  const { data: inHotel } = useTireSets(true)
  // undefined = the proposal; null = "später zuweisen"
  const [placeChoice, setPlaceChoice] = useState<string | null | undefined>(undefined)
  const book = useBookTaskTires()

  // the set mounted leaves – its place is free for the one taken off
  const others = inHotel?.filter((s) => s.id !== form.mountedId)
  const proposal = swapPlace(form, tires) ?? (places && others ? (nextFreePlace(places, occupancy(others), lastUsedPlace(others))?.id ?? null) : null)
  const placeId = placeChoice === undefined ? proposal : placeChoice
  const place = places?.find((p) => p.id === placeId)

  const errors = bookingErrors(form, today)
  const back = () => navigate(`/tasks/${task.id}`)
  const v = task.vehicle

  function save() {
    setShowRequired(true)
    if (hasErrors(errors) || isEmpty(form)) {
      scrollToFirstError()
      return
    }
    book.mutate(
      { taskId: task.id, request: toBookingRequest(form, placeId) },
      {
        onSuccess: (booked) => {
          toast.success(
            booked.removed?.place ? `Gebucht – abmontierte Räder auf ${booked.removed.place}` : 'Radwechsel im Pneuhotel gebucht',
          )
          back()
        },
        onError: (e) => {
          const fields = e instanceof ApiError ? (e.problem.errors ?? []) : []
          toast.error(fields.length > 0 ? `Nicht gebucht: ${fields.map((f) => f.message).join(', ')}` : `Nicht gebucht: ${e.message}`)
        },
      },
    )
  }

  return (
    <>
      <div className={styles.header}>
        <h1>Radwechsel buchen</h1>
        <Link to={`/tasks/${task.id}`}>Zum Auftrag</Link>
      </div>
      <p className={styles.chosen}>
        <strong>{task.customer.displayName}</strong>
        {v?.licensePlate && <LicensePlate text={v.licensePlate} size="sm" />} {v?.description}
      </p>

      {tires.mounted ? (
        <p className={styles.chosen}>
          Montiert gebucht: <Link to={`/tires/${tires.mounted.id}`}>{setSummary(tires.mounted)}</Link>
        </p>
      ) : (
        <section className={styles.section} aria-labelledby="mounted-title">
          <h2 id="mounted-title">Montiert – aus dem Pneuhotel</h2>
          <div className={styles.choices} role="radiogroup" aria-labelledby="mounted-title">
            {tires.inHotel.map((s) => (
              <Choice
                key={s.id}
                name="mounted"
                label={`${setSummary(s)}${s.place ? ` – ${s.place}` : ''}`}
                checked={form.mountedId === s.id}
                onChange={() => setForm({ ...form, mountedId: s.id, mounted: { ...form.mounted, season: s.season } })}
              />
            ))}
            <Choice
              name="mounted"
              label={tires.inHotel.length === 0 ? 'Keine Sätze dieses Fahrzeugs im Pneuhotel' : 'Keiner aus dem Pneuhotel (mitgebracht)'}
              checked={form.mountedId === null}
              onChange={() => setForm({ ...form, mountedId: null })}
            />
          </div>
          {form.mountedId && (
            <>
              <h3>Profiltiefe laut Auftragszettel</h3>
              <p className="muted">Leer lassen, wenn nicht neu gemessen.</p>
              <TreadDepthsInput form={form.mounted} onChange={(mounted) => setForm({ ...form, mounted })} errors={errors.mounted} limits={limits} />
            </>
          )}
        </section>
      )}

      {tires.removed ? (
        <p className={styles.chosen}>
          Abmontiert eingelagert: <Link to={`/tires/${tires.removed.id}`}>{setSummary(tires.removed)}</Link>
          {tires.removed.place && <strong>{tires.removed.place}</strong>}
        </p>
      ) : (
        <section className={styles.section} aria-labelledby="removed-title">
          <h2 id="removed-title">Abmontiert – einlagern</h2>
          <div className={styles.choices} role="radiogroup" aria-labelledby="removed-title">
            {tires.retrieved
              .filter((s) => s.id !== form.mountedId && s.id !== tires.mounted?.id)
              .map((s) => (
                <Choice
                  key={s.id}
                  name="removed"
                  label={`Wieder einlagern: ${setSummary(s)}`}
                  checked={form.removedChoice === s.id}
                  onChange={() => setForm({ ...form, removedChoice: s.id, removed: { ...form.removed, season: s.season } })}
                />
              ))}
            <Choice name="removed" label="Neuer Satz" checked={form.removedChoice === 'new'} onChange={() => setForm({ ...form, removedChoice: 'new' })} />
            <Choice
              name="removed"
              label="Nicht einlagern (nimmt der Kunde mit)"
              checked={form.removedChoice === 'none'}
              onChange={() => setForm({ ...form, removedChoice: 'none' })}
            />
          </div>
          {form.removedChoice === 'new' && (
            <TireSetFields form={form.removed} onChange={(removed) => setForm({ ...form, removed })} errors={errors.removed} showRequired={showRequired} />
          )}
          {form.removedChoice !== 'none' && (
            <>
              <h3>Profiltiefe laut Auftragszettel</h3>
              <TreadDepthsInput form={form.removed} onChange={(removed) => setForm({ ...form, removed })} errors={errors.removed} limits={limits} />
              <h3>Lagerplatz: {place ? place.address : 'später zuweisen'}</h3>
              {locations && places && others && locations.length > 0 && (
                <>
                  <PlaceMap
                    locations={locations}
                    places={places}
                    sets={others}
                    limits={limits}
                    mode="pick"
                    selected={placeId}
                    onPick={(p) => setPlaceChoice(p.id)}
                  />
                  {placeId && (
                    <p>
                      <Button variant="ghost" small onClick={() => setPlaceChoice(null)}>
                        Später zuweisen
                      </Button>
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      <StickyFooterSpacer />
      <StickyFooter>
        <Button icon={ArrowLeft} onClick={back} disabled={book.isPending}>
          Zurück
        </Button>
        {showRequired && hasErrors(errors) && <span className={styles.hint}>Bitte die markierten Felder prüfen</span>}
        {showRequired && isEmpty(form) && <span className={styles.hint}>Nichts zu buchen</span>}
        <Button variant="primary" icon={Save} onClick={save} loading={book.isPending} disabled={!!tires.mounted && !!tires.removed}>
          Buchen
        </Button>
      </StickyFooter>
    </>
  )
}

/** One choice of a list – the whole row is clickable (touch) */
function Choice({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={styles.choice}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}
