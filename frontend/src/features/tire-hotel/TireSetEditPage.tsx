import { Save } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../components/ui/StickyFooter'
import { useToast } from '../../components/ui/toastContext'
import { useToday } from '../../lib/clock'
import { VehiclePicker } from '../tasks/wizard/VehiclePicker'
import type { VehicleChoice } from '../tasks/wizard/wizardState'
import { useSaveTireSet, useTireSet, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { TireSetFields } from './TireSetFields'
import { formFromSet, tireSetErrors, toTireSetRequest, type TireSetForm } from './tireSetForm'

/** Edit the data of a set – the customer stays, the vehicle may change; the depths change by measuring. */
export function TireSetEditPage() {
  const { id } = useParams()
  const set = useTireSet(id)
  // the data wins: a failed background refetch (Wi-Fi gap) must not unmount the form and lose the input
  if (!set.data) return <p className="muted">{set.error ? `Satz konnte nicht geladen werden: ${set.error.message}` : 'Lade …'}</p>
  return <TireSetEdit key={set.data.id} set={set.data} />
}

function TireSetEdit({ set }: { set: TireSet }) {
  const today = useToday()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveTireSet()
  // the version as it was when the form opened (conventions) – a live update must not hide a change from another device
  const [openedVersion] = useState(set.version)
  const [form, setForm] = useState<TireSetForm>(() => formFromSet(set))
  const [vehicle, setVehicle] = useState<VehicleChoice>(set.vehicle ? { kind: 'vehicle', vehicle: set.vehicle } : { kind: 'open' })
  const errors = tireSetErrors(form, today)

  function submit() {
    if (Object.keys(errors).length > 0) return
    save.mutate(
      { id: set.id, request: toTireSetRequest({ customer: set.customer, vehicle }, form, openedVersion) },
      {
        onSuccess: () => {
          toast.success('Gespeichert')
          navigate(`/tires/${set.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error('Der Satz wurde inzwischen auf einem anderen Gerät geändert. Bitte neu laden.')
          } else {
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  return (
    <>
      <h1>Satz von {set.customer.displayName} bearbeiten</h1>
      <VehiclePicker customer={set.customer} value={vehicle} onChange={setVehicle} />
      <section className={styles.section} aria-labelledby="set-title">
        <h2 id="set-title">Satz</h2>
        <TireSetFields form={form} onChange={setForm} errors={errors} showRequired />
        <p className="muted">Die Profiltiefen ändern sich mit «Nachmessen» – so bleiben sie im Verlauf.</p>
      </section>
      <StickyFooterSpacer />
      <StickyFooter>
        <Button onClick={() => navigate(`/tires/${set.id}`)}>Abbrechen</Button>
        <Button variant="primary" icon={Save} onClick={submit} loading={save.isPending}>
          Speichern
        </Button>
      </StickyFooter>
    </>
  )
}
