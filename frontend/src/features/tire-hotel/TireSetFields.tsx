import { Checkbox, Select, TextArea, TextField } from '../../components/ui/Fields'
import { KINDS, RIMS, SEASONS, type RimKind, type Season, type TireSetKind } from './tireHotelApi'
import { withKind, yearOf, type TireSetErrors, type TireSetForm } from './tireSetForm'
import styles from './TireHotel.module.css'

/**
 * What a set is (FB-07): season, wheels or tyres, rims, what comes with it, torque and pressure to mount it (FB-11), and the tyres themselves
 * – one brand, model, dimension and year for the set (the newer concept of the workshop; no DOT
 * per wheel). Used to store a set and to edit it.
 */
export function TireSetFields({
  form,
  onChange,
  errors,
  showRequired,
}: {
  form: TireSetForm
  onChange: (form: TireSetForm) => void
  errors: TireSetErrors
  /** "missing" errors only after trying to save */
  showRequired: boolean
}) {
  const set = <K extends keyof TireSetForm>(field: K, value: TireSetForm[K]) => onChange({ ...form, [field]: value })
  const required = (field: 'season' | 'kind') => (showRequired ? errors[field] : undefined)

  return (
    <>
      <div className={styles.row}>
        <Select label="Saison" required value={form.season} onChange={(e) => set('season', e.target.value as Season)} error={required('season')}>
          <option value="" disabled>
            Bitte wählen …
          </option>
          {Object.entries(SEASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Typ"
          required
          value={form.kind}
          onChange={(e) => onChange(withKind(form, e.target.value as TireSetKind))}
          error={required('kind')}
        >
          <option value="" disabled>
            Bitte wählen …
          </option>
          {Object.entries(KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {/* only complete wheels have rims */}
        <Select label="Felgen" value={form.rims} disabled={form.kind !== 'WHEELS'} onChange={(e) => set('rims', e.target.value as RimKind | '')}>
          <option value="">{form.kind === 'WHEELS' ? 'unbekannt' : '–'}</option>
          {Object.entries(RIMS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.checks}>
        <Checkbox label="Radkappen dabei" checked={form.hubCaps} onChange={(e) => set('hubCaps', e.target.checked)} />
        <Checkbox
          label="Radschrauben beachten (spezielle Schrauben – im Auto suchen)"
          checked={form.wheelBolts}
          onChange={(e) => set('wheelBolts', e.target.checked)}
        />
      </div>
      <div className={styles.row}>
        <TextField
          label="Drehmoment Radschrauben (Nm)"
          placeholder="z. B. 120"
          inputMode="numeric"
          maxLength={3}
          autoComplete="off"
          value={form.torque}
          onChange={(e) => set('torque', e.target.value)}
          error={errors.torque}
        />
        <TextField
          label="Luftdruck vorne (bar)"
          placeholder="z. B. 2,5"
          inputMode="decimal"
          maxLength={4}
          autoComplete="off"
          value={form.pressureFront}
          onChange={(e) => set('pressureFront', e.target.value)}
          error={errors.pressureFront}
        />
        <TextField
          label="Luftdruck hinten (bar)"
          placeholder="z. B. 2,7"
          inputMode="decimal"
          maxLength={4}
          autoComplete="off"
          value={form.pressureRear}
          onChange={(e) => set('pressureRear', e.target.value)}
          error={errors.pressureRear}
        />
      </div>
      <div className={styles.row}>
        <TextField label="Marke" placeholder="z. B. Michelin" maxLength={60} autoComplete="off" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
        <TextField label="Modell" placeholder="z. B. Alpin 6" maxLength={60} autoComplete="off" value={form.model} onChange={(e) => set('model', e.target.value)} />
        <TextField
          label="Dimension"
          placeholder="z. B. 205/55 R16 91H"
          maxLength={40}
          autoComplete="off"
          value={form.dimension}
          onChange={(e) => set('dimension', e.target.value)}
        />
      </div>
      <div className={styles.row}>
        <TextField
          label="Jahrgang oder DOT"
          hint="z. B. 2022 – oder die DOT-Nummer 2321 (Woche 23/2021)"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={form.year}
          onChange={(e) => set('year', e.target.value)}
          // a DOT code shows its year once typed (FB-12)
          onBlur={() => {
            if (errors.year) return
            const year = yearOf(form.year)
            if (year !== undefined && String(year) !== form.year.trim()) set('year', String(year))
          }}
          error={errors.year}
        />
        <TextArea
          label="Bemerkung"
          placeholder="z. B. kleiner Nagel VR, Felge HL mit Delle"
          rows={2}
          maxLength={500}
          value={form.remark}
          onChange={(e) => set('remark', e.target.value)}
        />
      </div>
    </>
  )
}
