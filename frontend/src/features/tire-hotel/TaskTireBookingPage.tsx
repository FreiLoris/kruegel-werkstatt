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
import { bookingErrors, hasErrors, initialBooking, isEmpty, setSummary, swapPlace, toBookingRequest, withChoice, withSet, type BookingForm } from './taskTires'
import { useBookTaskTires, useTaskTires, useTireLocations, useTirePlaces, useTireSets, useTreadLimits, type TaskTires, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { TireSetFields } from './TireSetFields'
import { lastUsedPlace, nextFreePlace, occupancy } from './tirePlaces'
import { TreadDepthsInput } from './TreadDepthsInput'
import { scrollToFirstError } from '../../lib/scrollToFirstError'

/**
 * The tyre change of a task (13q, FB-12) – once the wheels are changed, from the task sheet: the set
 * put on (from the hotel, or the customer's own) and the one taken off (into the hotel, or home with
 * the customer), both with the depths noted on the sheet. Tyres not stored are recorded too, so the
 * next call shows whether they are still good. Proposed is the usual swap: the set of the hotel on,
 * the one on the car off and onto the place that just became free.
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
  const others = inHotel?.filter((s) => s.id !== form.mountedChoice)
  const proposal = swapPlace(form, tires) ?? (places && others ? (nextFreePlace(places, occupancy(others), lastUsedPlace(others))?.id ?? null) : null)
  const placeId = placeChoice === undefined ? proposal : placeChoice
  const place = places?.find((p) => p.id === placeId)

  const errors = bookingErrors(form, today)
  const back = () => navigate(`/tasks/${task.id}`)
  const v = task.vehicle
  // FB-12: the customer's own tyres – brought along again, or the ones on the car to take off
  const withCustomer = tires.outside.filter((s) => s.state === 'WITH_CUSTOMER')
  // not the one put on now – nor the one this task already put on
  const offTheCar = tires.outside.filter((s) => s.id !== form.mountedChoice && s.id !== tires.mounted?.id)
  const removedSet = offTheCar.find((s) => s.id === form.removedChoice)
  const choose = (which: 'mounted' | 'removed', choice: string, set?: TireSet) => setForm(withChoice(form, which, choice, set))

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
          toast.success(booked.removed?.place ? `Gebucht – abmontierte Räder auf ${booked.removed.place}` : 'Radwechsel gebucht')
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
          <h2 id="mounted-title">Montiert</h2>
          <div className={styles.choices} role="radiogroup" aria-labelledby="mounted-title">
            {tires.inHotel.map((s) => (
              <Choice
                key={s.id}
                name="mounted"
                label={`Aus dem Pneuhotel: ${setSummary(s)}${s.place ? ` – ${s.place}` : ''}`}
                checked={form.mountedChoice === s.id}
                onChange={() => choose('mounted', s.id, s)}
              />
            ))}
            {withCustomer.map((s) => (
              <Choice
                key={s.id}
                name="mounted"
                label={`Vom Kunden mitgebracht: ${setSummary(s)}`}
                checked={form.mountedChoice === s.id}
                onChange={() => choose('mounted', s.id, s)}
              />
            ))}
            <Choice
              name="mounted"
              label="Vom Kunden mitgebracht – Reifendaten erfassen"
              checked={form.mountedChoice === 'new'}
              onChange={() => choose('mounted', 'new')}
            />
            <Choice name="mounted" label="Nicht erfassen" checked={form.mountedChoice === 'none'} onChange={() => choose('mounted', 'none')} />
          </div>
          {form.mountedChoice === 'new' && (
            <TireSetFields
              form={form.mounted}
              onChange={(mounted) => setForm(withSet(form, 'mounted', mounted, tires))}
              errors={errors.mounted}
              showRequired={showRequired}
            />
          )}
          {form.mountedChoice !== 'none' && (
            <>
              <h3>Profiltiefe laut Auftragszettel</h3>
              {form.mountedChoice !== 'new' && <p className="muted">Leer lassen, wenn nicht neu gemessen.</p>}
              <TreadDepthsInput form={form.mounted} onChange={(mounted) => setForm({ ...form, mounted })} errors={errors.mounted} limits={limits} />
            </>
          )}
        </section>
      )}

      {tires.removed ? (
        <p className={styles.chosen}>
          {tires.removedAs === 'TAKEN_HOME' ? 'Abmontiert, nimmt der Kunde mit' : 'Abmontiert eingelagert'}:{' '}
          <Link to={`/tires/${tires.removed.id}`}>{setSummary(tires.removed)}</Link>
          {tires.removed.place && <strong>{tires.removed.place}</strong>}
        </p>
      ) : (
        <section className={styles.section} aria-labelledby="removed-title">
          <h2 id="removed-title">Abmontiert</h2>
          <div className={styles.choices} role="radiogroup" aria-labelledby="removed-title">
            {offTheCar.map((s) => (
              <Choice
                key={s.id}
                name="removed"
                label={`${s.state === 'MOUNTED' ? 'War montiert' : 'Bekannt'}: ${setSummary(s)}`}
                checked={form.removedChoice === s.id}
                onChange={() => choose('removed', s.id, s)}
              />
            ))}
            <Choice name="removed" label="Neuer Satz – Reifendaten erfassen" checked={form.removedChoice === 'new'} onChange={() => choose('removed', 'new')} />
            <Choice name="removed" label="Nicht erfassen" checked={form.removedChoice === 'none'} onChange={() => choose('removed', 'none')} />
          </div>
          {form.removedChoice !== 'none' && (
            <>
              <h3 id="removed-to-title">Wohin?</h3>
              <div className={styles.choices} role="radiogroup" aria-labelledby="removed-to-title">
                <Choice name="removed-to" label="Ins Pneuhotel" checked={form.removedTo === 'hotel'} onChange={() => setForm({ ...form, removedTo: 'hotel' })} />
                {/* FB-12: not stored, still known – with its depths for the next call; one already with the customer goes into the hotel */}
                {removedSet?.state !== 'WITH_CUSTOMER' && (
                  <Choice
                    name="removed-to"
                    label="Nimmt der Kunde mit"
                    checked={form.removedTo === 'customer'}
                    onChange={() => setForm({ ...form, removedTo: 'customer' })}
                  />
                )}
              </div>
            </>
          )}
          {form.removedChoice === 'new' && (
            <TireSetFields
              form={form.removed}
              onChange={(removed) => setForm(withSet(form, 'removed', removed, tires))}
              errors={errors.removed}
              showRequired={showRequired}
            />
          )}
          {form.removedChoice !== 'none' && (
            <>
              <h3>Profiltiefe laut Auftragszettel</h3>
              <TreadDepthsInput form={form.removed} onChange={(removed) => setForm({ ...form, removed })} errors={errors.removed} limits={limits} />
            </>
          )}
          {form.removedChoice !== 'none' && form.removedTo === 'hotel' && (
            <>
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
