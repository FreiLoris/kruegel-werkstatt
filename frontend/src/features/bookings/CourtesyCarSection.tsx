import { Checkbox, TextField } from '../../components/ui/Fields'
import type { AppointmentForm } from '../tasks/wizard/appointmentForm'
import { Section } from '../tasks/wizard/AppointmentStep'
import { choiceError, periodOf, type CourtesyCarChoice } from './courtesyCarChoice'
import { CourtesyCarPicker } from './CourtesyCarPicker'
import styles from './CourtesyCarSection.module.css'

/**
 * Wizard step 2: does the customer need a courtesy car? Pickup/return follow the appointment
 * until changed by hand; the list shows which car is free (7c).
 */
export function CourtesyCarSection({
  value: choice,
  onChange,
  appointment,
  showRequired,
}: {
  value: CourtesyCarChoice
  onChange: (value: CourtesyCarChoice) => void
  appointment: AppointmentForm
  /** missing choices as error only after trying to continue */
  showRequired: boolean
}) {
  const period = periodOf(choice, appointment)
  const error = showRequired ? choiceError(choice, appointment) : null
  return (
    <Section title="Ersatzwagen">
      <Checkbox
        label="Kunde braucht einen Ersatzwagen"
        checked={choice.wanted}
        onChange={(e) => onChange({ ...choice, wanted: e.target.checked })}
      />
      {choice.wanted && (
        <>
          <CourtesyCarPicker
            name="wizard-courtesy-car"
            pickupAt={period?.pickupAt ?? null}
            returnAt={period?.returnAt ?? null}
            onPeriodChange={(pickupAt, returnAt) => onChange({ ...choice, pickupAt, returnAt })}
            courtesyCarId={choice.courtesyCarId}
            onCarChange={(courtesyCarId) => onChange({ ...choice, courtesyCarId })}
          />
          <TextField label="Notiz zum Ersatzwagen" value={choice.notes} onChange={(e) => onChange({ ...choice, notes: e.target.value })} />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Section>
  )
}
