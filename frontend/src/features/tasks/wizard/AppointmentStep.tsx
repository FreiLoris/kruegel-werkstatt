import { Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Checkbox, Select, TextArea, TextField } from '../../../components/ui/Fields'
import { formatDate, formatDuration } from '../../../lib/format'
import { useActiveEmployees } from '../../employees/employeeApi'
import { useInspectionStations } from '../../inspection-stations/inspectionStationApi'
import { useInsurances } from '../../insurances/insuranceApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { PARTS_STATUS, TIRE_CHANGE_KINDS, type TireChangeKind } from '../taskApi'
import {
  appointmentErrors,
  appointmentMinutes,
  MFK_DURATIONS,
  mfkBeforeEnd,
  withArrivesEarlier,
  withDate,
  withMfk,
  withMfkStation,
  withReadyBy,
  withService,
  withSlot,
  type AppointmentForm,
} from './appointmentForm'
import styles from './AppointmentStep.module.css'
import { CapacityOverview } from './CapacityOverview'
import { PartsDialog } from './PartsDialog'
import { SameVehicleHint } from './SameVehicleHint'

interface AppointmentStepProps {
  value: AppointmentForm
  onChange: (value: AppointmentForm) => void
  /** date → holiday name (canton of Zurich) */
  holidays: ReadonlyMap<string, string>
  /** Show "Datum wählen" as error – only after the user tried to continue */
  showRequired: boolean
  /** when editing: the task itself, so the overview does not count it as being in its own way */
  taskId?: string
  /** the chosen vehicle – for the hint that it already has a task (FB-01); empty = still open */
  vehicleId?: string
  /** more sections below the form, e.g. the courtesy car in the wizard */
  children?: ReactNode
}

/**
 * Wizard step 2: appointment and work on the left, the week overview on the right (sticky, so it
 * stays visible while scrolling through the options – UI review). Defaults: "kommt früher" = the
 * day of the appointment at opening time (the evening before for an appointment at opening time),
 * "fertig bis" = the same evening.
 */
export function AppointmentStep({ value: form, onChange, holidays, showRequired, taskId, vehicleId, children }: AppointmentStepProps) {
  const { data: employees } = useActiveEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const { data: insurances } = useInsurances()
  const { data: stations } = useInspectionStations()
  const holidayDates = new Set(holidays.keys())
  // the material order is entered in its own window; the form only changes on "Übernehmen"
  const [partsOpen, setPartsOpen] = useState(false)
  const errors = appointmentErrors(form)
  // "missing" errors only after trying to continue – not while the user is still filling in
  const required = (field: 'date' | 'serviceItemIds' | 'acceptedById' | 'insuranceId') => (showRequired ? errors[field] : undefined)

  const set = <K extends keyof AppointmentForm>(field: K, fieldValue: AppointmentForm[K]) => onChange({ ...form, [field]: fieldValue })

  function toggleServiceItem(id: string, on: boolean) {
    set('serviceItemIds', on ? [...form.serviceItemIds, id] : form.serviceItemIds.filter((item) => item !== id))
  }

  const duration = errors.endTime ? null : appointmentMinutes(form)

  const mechanics = (employees ?? []).filter((e) => e.selectableAsMechanic)
  const activeLifts = (lifts ?? []).filter((l) => l.active)
  const activeServiceItems = (serviceItems ?? []).filter((s) => s.active)
  // editing: the insurance of the task stays choosable, even if it is no longer used
  const insuranceChoice = (insurances ?? []).filter((i) => i.active || i.id === form.insuranceId)
  // a duration saved before that is not in the list stays choosable
  const mfkDurations = MFK_DURATIONS.includes(Number(form.mfkMinutes)) ? MFK_DURATIONS : [...MFK_DURATIONS, Number(form.mfkMinutes)].sort((a, b) => a - b)
  const mfkWarning = mfkBeforeEnd(form)
  const standardStation = stations?.find((s) => s.standard)
  // editing: the station of the task stays choosable, even if it is no longer used
  const stationChoice = (stations ?? []).filter((s) => s.active || s.id === form.mfkStationId)

  return (
    <div className={styles.layout}>
      <div className={styles.form}>
        <Section title="Angenommen von">
          <Select
            label="Wer nimmt den Auftrag an?"
            required
            value={form.acceptedById}
            onChange={(e) => set('acceptedById', e.target.value)}
            error={required('acceptedById')}
          >
            {/* no preset on purpose: the PCs are shared, the person of the device is often someone else */}
            <option value="" disabled>
              Bitte wählen …
            </option>
            {(employees ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
            {/* editing: whoever accepted it stays, even if they have left since */}
            {form.acceptedById && employees && !employees.some((e) => e.id === form.acceptedById) && (
              <option value={form.acceptedById}>(nicht mehr aktiv)</option>
            )}
          </Select>
        </Section>

        <Section title="Termin">
          <Checkbox
            label="Noch kein Termin – der Auftrag kommt in die Liste «Ohne Termin»"
            checked={form.noAppointment}
            onChange={(e) => set('noAppointment', e.target.checked)}
          />
          {vehicleId && form.noAppointment && <SameVehicleHint vehicleId={vehicleId} date="" taskId={taskId} />}
          {!form.noAppointment && (
            <>
              <div className={styles.row}>
                <TextField
                  label="Datum"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => onChange(withDate(form, e.target.value, form.time, holidayDates))}
                  hint="oder rechts im Raster ziehen"
                  error={form.date ? errors.date : required("date")}
                />
                <TextField
                  label="Uhrzeit"
                  type="time"
                  step={900}
                  required
                  value={form.time}
                  onChange={(e) => onChange(withDate(form, form.date, e.target.value, holidayDates))}
                  error={errors.time}
                />
              </div>
              <div className={styles.row}>
                <TextField
                  label="Bis (Datum)"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  hint="so lange ist der Lift belegt"
                />
                <TextField
                  label="bis um"
                  type="time"
                  step={900}
                  required
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  hint={duration === null ? undefined : `Dauer ${formatDuration(duration)}`}
                  error={form.date ? errors.endTime : undefined}
                />
              </div>
              {vehicleId && <SameVehicleHint vehicleId={vehicleId} date={form.date} taskId={taskId} />}
              <Checkbox
                label="Uhrzeit noch offen – der Lift bleibt für die Zeit oben reserviert, angezeigt wird «Zeit offen»"
                checked={form.timeOpen}
                onChange={(e) => set('timeOpen', e.target.checked)}
              />
              <Checkbox
                label="Wartekunde – Kunde wartet vor Ort"
                checked={form.waitingCustomer}
                onChange={(e) => set('waitingCustomer', e.target.checked)}
              />
              <Checkbox
                label="Fahrzeug kommt früher"
                checked={form.arrivesEarlier}
                onChange={(e) => onChange(withArrivesEarlier(form, e.target.checked, holidayDates))}
              />
              {form.arrivesEarlier && (
                <div className={`${styles.row} ${styles.indented}`}>
                  <TextField
                    label="Kommt am"
                    type="date"
                    value={form.arrivesEarlierDate}
                    onChange={(e) => set('arrivesEarlierDate', e.target.value)}
                    error={errors.arrivesEarlierDate}
                  />
                  <TextField
                    label="um"
                    type="time"
                    step={900}
                    value={form.arrivesEarlierTime}
                    onChange={(e) => set('arrivesEarlierTime', e.target.value)}
                  />
                </div>
              )}
              <Checkbox label="Muss fertig sein bis" checked={form.readyBy} onChange={(e) => onChange(withReadyBy(form, e.target.checked))} />
              {form.readyBy && (
                <div className={`${styles.row} ${styles.indented}`}>
                  <TextField
                    label="Fertig am"
                    type="date"
                    value={form.readyByDate}
                    onChange={(e) => set('readyByDate', e.target.value)}
                    error={errors.readyByDate}
                  />
                  <TextField label="um" type="time" step={900} value={form.readyByTime} onChange={(e) => set('readyByTime', e.target.value)} />
                </div>
              )}
            </>
          )}
        </Section>

        <Section title="Wer und wo">
          <div className={styles.row}>
            <Select label="Mechaniker" value={form.mechanicId} onChange={(e) => set('mechanicId', e.target.value)}>
              <option value="">noch offen</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              {/* the chosen one stays visible, even if no longer choosable – it is what gets sent */}
              {form.mechanicId && employees && !mechanics.some((m) => m.id === form.mechanicId) && (
                <option value={form.mechanicId}>{employees.find((e) => e.id === form.mechanicId)?.name ?? ''} (nicht mehr aktiv)</option>
              )}
            </Select>
            {/* a lift is taken for a time – without an appointment there is none to take */}
            <Select
              label="Lift"
              value={form.noAppointment ? '' : form.liftId}
              disabled={form.noAppointment}
              onChange={(e) => set('liftId', e.target.value)}
            >
              <option value="">noch offen</option>
              {activeLifts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              {form.liftId && lifts && !activeLifts.some((l) => l.id === form.liftId) && (
                <option value={form.liftId}>{lifts.find((l) => l.id === form.liftId)?.name ?? ''} (ausser Betrieb)</option>
              )}
            </Select>
          </div>
        </Section>

        <Section title="Arbeiten">
          <Checkbox
            label="Radwechsel"
            checked={form.tireChange}
            onChange={(e) => onChange({ ...form, tireChange: e.target.checked, tireChangeKind: e.target.checked ? form.tireChangeKind : '' })}
          />
          {form.tireChange && (
            <div className={`${styles.row} ${styles.indented}`}>
              <Select
                label="Art"
                value={form.tireChangeKind}
                onChange={(e) => set('tireChangeKind', e.target.value as TireChangeKind | '')}
              >
                <option value="">noch offen</option>
                {Object.entries(TIRE_CHANGE_KINDS).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Checkbox label="MFK" checked={form.mfk} onChange={(e) => onChange(withMfk(form, e.target.checked, standardStation))} />
          {form.mfk && (
            <div className={styles.indented}>
              <div className={styles.row}>
                <TextField
                  label="MFK-Termin am"
                  type="date"
                  value={form.mfkDate}
                  onChange={(e) => set('mfkDate', e.target.value)}
                  error={errors.mfkDate}
                />
                <TextField
                  label="um"
                  type="time"
                  step={900}
                  hint="leer lassen, wenn noch nicht bekannt"
                  value={form.mfkTime}
                  onChange={(e) => set('mfkTime', e.target.value)}
                />
              </div>
              <Select
                label="Prüfstelle"
                // empty (a task from before 13l): the standard, as the server takes it
                value={form.mfkStationId || standardStation?.id || ''}
                onChange={(e) => {
                  const station = stations?.find((s) => s.id === e.target.value)
                  if (station) onChange(withMfkStation(form, station))
                }}
              >
                {stationChoice.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.active ? s.name : `${s.name} (nicht mehr verwendet)`}
                  </option>
                ))}
              </Select>
              <div className={styles.row}>
                <Select
                  label="Dauer inkl. Fahrt"
                  hint="so lange steht der MFK-Termin im Kalender"
                  value={form.mfkMinutes}
                  onChange={(e) => set('mfkMinutes', e.target.value)}
                >
                  {mfkDurations.map((minutes) => (
                    <option key={minutes} value={String(minutes)}>
                      {formatDuration(minutes)}
                    </option>
                  ))}
                </Select>
                <Select label="Wer fährt?" value={form.mfkDriverId} onChange={(e) => set('mfkDriverId', e.target.value)}>
                  <option value="">noch offen</option>
                  {(employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                  {form.mfkDriverId && employees && !employees.some((e) => e.id === form.mfkDriverId) && (
                    <option value={form.mfkDriverId}>(nicht mehr aktiv)</option>
                  )}
                </Select>
              </div>
              {mfkWarning && <p className={styles.warning}>{mfkWarning}</p>}
            </div>
          )}

          {/* like Radwechsel and MFK: tick first, then the choice (feedback from the workshop, 10/2026) */}
          {activeServiceItems.length > 0 && (
            <>
              <Checkbox label="Service" checked={form.service} onChange={(e) => onChange(withService(form, e.target.checked))} />
              {form.service && (
                <div className={styles.indented}>
                  <fieldset className={styles.serviceItems}>
                    <legend>Leistungen</legend>
                    {activeServiceItems.map((item) => (
                      <Checkbox
                        key={item.id}
                        label={item.name}
                        checked={form.serviceItemIds.includes(item.id)}
                        onChange={(e) => toggleServiceItem(item.id, e.target.checked)}
                      />
                    ))}
                  </fieldset>
                  {required('serviceItemIds') && <p className={styles.error}>{required('serviceItemIds')}</p>}
                </div>
              )}
            </>
          )}

          {/* ticking opens the window; the tick only stays once something was entered there */}
          <Checkbox
            label="Material bestellen"
            checked={form.parts}
            onChange={(e) => (e.target.checked ? setPartsOpen(true) : set('parts', false))}
          />
          {form.parts && (
            <div className={`${styles.indented} ${styles.partsSummary}`}>
              <p className={styles.partsText}>
                <strong>{form.partsDescription}</strong>
                {' · '}
                {PARTS_STATUS[form.partsStatus]}
                {form.partsSupplier.trim() && ` · ${form.partsSupplier.trim()}`}
                {form.partsOrderedOn && ` · bestellt am ${formatDate(form.partsOrderedOn)}`}
              </p>
              <Button small icon={Pencil} onClick={() => setPartsOpen(true)}>
                Ändern
              </Button>
            </div>
          )}
          {partsOpen && (
            <PartsDialog
              initial={{
                partsDescription: form.partsDescription,
                partsStatus: form.partsStatus,
                partsSupplier: form.partsSupplier,
                partsOrderedOn: form.partsOrderedOn,
              }}
              onApply={(parts) => {
                onChange({ ...form, parts: true, ...parts })
                setPartsOpen(false)
              }}
              onClose={() => setPartsOpen(false)}
            />
          )}

          <TextArea
            label="Weitere Arbeiten"
            hint="Was der Mechaniker sonst noch wissen muss – erscheint auf dem Auftragszettel"
            maxLength={2000}
            value={form.workDescription}
            onChange={(e) => set('workDescription', e.target.value)}
          />
        </Section>

        <Section title="Versicherung">
          <Checkbox
            label="Versicherungsfall – Versicherung und Schadennummer kommen auf den Auftragszettel"
            checked={form.insuranceCase}
            onChange={(e) => set('insuranceCase', e.target.checked)}
          />
          {form.insuranceCase && (
            <div className={`${styles.row} ${styles.indented}`}>
              <Select
                label="Versicherung"
                required
                value={form.insuranceId}
                onChange={(e) => set('insuranceId', e.target.value)}
                hint={insurances && insuranceChoice.length === 0 ? 'Noch keine erfasst – in den Einstellungen unter «Versicherungen»' : undefined}
                error={form.insuranceId ? undefined : required('insuranceId')}
              >
                <option value="" disabled>
                  Bitte wählen …
                </option>
                {insuranceChoice.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.active ? i.name : `${i.name} (nicht mehr verwendet)`}
                  </option>
                ))}
              </Select>
              <TextField
                label="Schadennummer"
                hint="leer lassen, wenn noch nicht bekannt"
                maxLength={60}
                autoComplete="off"
                value={form.claimNumber}
                onChange={(e) => set('claimNumber', e.target.value)}
              />
            </div>
          )}
        </Section>

        <Section title="Interne Notizen">
          <TextArea
            label="Notizen"
            hint="Nur intern, z. B. «Schlüssel im Briefkasten»"
            rows={3}
            maxLength={2000}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Section>
        {children}
      </div>

      <aside className={styles.aside}>
        <CapacityOverview
          picked={{ liftId: form.liftId || null, date: form.date, time: form.time, endAt: `${form.endDate}T${form.endTime}` }}
          holidays={holidays}
          // picking a day IS planning – like dragging a slot, "Noch kein Termin" is off again
          onPickDay={(date) => onChange({ ...withDate(form, date, form.time, holidayDates), noAppointment: false })}
          onPickSlot={(slot) => onChange(withSlot(form, slot, holidayDates))}
          taskId={taskId}
        />
      </aside>
    </div>
  )
}

/** One block of the form (also used by sections from other features, e.g. the courtesy car) */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}
