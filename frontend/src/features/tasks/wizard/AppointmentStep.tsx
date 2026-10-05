import type { ReactNode } from 'react'
import { Checkbox, Select, TextArea, TextField } from '../../../components/ui/Fields'
import { formatDuration, minutesBetween } from '../../../lib/format'
import { useActiveEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { PARTS_STATUS, TIRE_CHANGE_KINDS, type PartsStatus, type TireChangeKind } from '../taskApi'
import {
  appointmentErrors,
  withArrivesEarlier,
  withDate,
  withMfk,
  withReadyBy,
  withSlot,
  type AppointmentForm,
} from './appointmentForm'
import styles from './AppointmentStep.module.css'
import { CapacityOverview } from './CapacityOverview'

interface AppointmentStepProps {
  value: AppointmentForm
  onChange: (value: AppointmentForm) => void
  /** date → holiday name (canton of Zurich) */
  holidays: ReadonlyMap<string, string>
  /** Show "Datum wählen" as error – only after the user tried to continue */
  showRequired: boolean
}

/**
 * Wizard step 2: appointment and work on the left, the week overview on the right (sticky, so it
 * stays visible while scrolling through the options – UI review). Defaults: "kommt früher" = the
 * evening of the previous working day, "fertig bis" = the same evening.
 */
export function AppointmentStep({ value: form, onChange, holidays, showRequired }: AppointmentStepProps) {
  const { data: employees } = useActiveEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const holidayDates = new Set(holidays.keys())
  const errors = appointmentErrors(form)
  // "missing" errors only after trying to continue – not while the user is still filling in
  const required = (field: 'date' | 'partsDescription') => (showRequired ? errors[field] : undefined)

  const set = <K extends keyof AppointmentForm>(field: K, fieldValue: AppointmentForm[K]) => onChange({ ...form, [field]: fieldValue })

  function toggleServiceItem(id: string, on: boolean) {
    set('serviceItemIds', on ? [...form.serviceItemIds, id] : form.serviceItemIds.filter((item) => item !== id))
  }

  const duration = errors.endTime || !form.date ? null : minutesBetween(`${form.date}T${form.time}`, `${form.endDate}T${form.endTime}`)

  const mechanics = (employees ?? []).filter((e) => e.selectableAsMechanic)
  const activeLifts = (lifts ?? []).filter((l) => l.active)
  const activeServiceItems = (serviceItems ?? []).filter((s) => s.active)

  return (
    <div className={styles.layout}>
      <div className={styles.form}>
        <Section title="Termin">
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
            </Select>
            <Select label="Lift" value={form.liftId} onChange={(e) => set('liftId', e.target.value)}>
              <option value="">noch offen</option>
              {activeLifts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
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
          <Checkbox label="MFK" checked={form.mfk} onChange={(e) => onChange(withMfk(form, e.target.checked))} />
          {form.mfk && (
            <div className={`${styles.row} ${styles.indented}`}>
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
          )}

          {activeServiceItems.length > 0 && (
            <fieldset className={styles.serviceItems}>
              <legend>Service</legend>
              {activeServiceItems.map((item) => (
                <Checkbox
                  key={item.id}
                  label={item.name}
                  checked={form.serviceItemIds.includes(item.id)}
                  onChange={(e) => toggleServiceItem(item.id, e.target.checked)}
                />
              ))}
            </fieldset>
          )}

          <Checkbox label="Material bestellen" checked={form.parts} onChange={(e) => set('parts', e.target.checked)} />
          {form.parts && (
            <div className={styles.indented}>
              <TextField
                label="Was"
                required
                placeholder="z. B. Bremsscheiben vorne"
                maxLength={500}
                value={form.partsDescription}
                onChange={(e) => set('partsDescription', e.target.value)}
                error={required("partsDescription")}
              />
              <div className={styles.row}>
                <Select label="Status" value={form.partsStatus} onChange={(e) => set('partsStatus', e.target.value as PartsStatus)}>
                  {Object.entries(PARTS_STATUS).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </Select>
                <TextField
                  label="Lieferant"
                  placeholder="z. B. Derendinger"
                  maxLength={100}
                  value={form.partsSupplier}
                  onChange={(e) => set('partsSupplier', e.target.value)}
                />
                <TextField label="Bestellt am" type="date" value={form.partsOrderedOn} onChange={(e) => set('partsOrderedOn', e.target.value)} />
              </div>
            </div>
          )}

          <TextArea
            label="Weitere Arbeiten"
            hint="Was der Mechaniker sonst noch wissen muss – erscheint auf dem Auftragszettel"
            maxLength={2000}
            value={form.workDescription}
            onChange={(e) => set('workDescription', e.target.value)}
          />
        </Section>

        <Section title="Auftragsnummer">
          <TextField
            label="Auftragsnummer aus SwissGarage"
            hint="Falls schon bekannt – sonst später im Auftrag eintragen"
            maxLength={30}
            autoComplete="off"
            value={form.taskNumber}
            onChange={(e) => set('taskNumber', e.target.value)}
          />
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
      </div>

      <aside className={styles.aside}>
        <CapacityOverview
          picked={{ liftId: form.liftId || null, date: form.date, time: form.time, endAt: `${form.endDate}T${form.endTime}` }}
          holidays={holidays}
          onPickDay={(date) => onChange(withDate(form, date, form.time, holidayDates))}
          onPickSlot={(slot) => onChange(withSlot(form, slot, holidayDates))}
        />
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}
