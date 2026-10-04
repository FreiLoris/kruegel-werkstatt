import type { FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Checkbox, Select, TextField } from '../../components/ui/Fields'
import { COLOR_SUGGESTIONS } from './colors'
import { ROLES, type Role } from './employeeApi'
import styles from './EmployeeForm.module.css'
import type { FormValues } from './formValues'
import { NameBadge } from './NameBadge'

interface EmployeeFormProps {
  /** So a button outside (in the modal footer) can submit the form: `<button form={id}>` */
  id: string
  values: FormValues
  onChange: (values: FormValues) => void
  onSubmit: () => void
  /** Error of the last save – field errors appear right at the field */
  error?: Error | null
  /** Colors of other active persons: color (#rrggbb, lower case) → name */
  takenColors: Map<string, string>
}

export function EmployeeForm({ id, values, onChange, onSubmit, error, takenColors }: EmployeeFormProps) {
  const fieldError = (field: string) => (error instanceof ApiError ? error.messageForField(field) : undefined)
  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) => onChange({ ...values, [field]: value })

  const colorOwner = takenColors.get(values.color.toLowerCase())
  const isCustomColor = !COLOR_SUGGESTIONS.some((c) => c.value === values.color.toLowerCase())

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form id={id} className={styles.form} onSubmit={submit}>
      <TextField
        label="Name"
        required
        placeholder="z. B. Erich"
        hint="So erscheint die Person in Auswahllisten und auf der Pinnwand."
        maxLength={40}
        autoComplete="off"
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        error={fieldError('name')}
      />

      <div className={styles.row}>
        <Select label="Rolle" required value={values.role} onChange={(e) => set('role', e.target.value as Role)} error={fieldError('role')}>
          {Object.entries(ROLES).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </Select>
        <TextField
          label="Geburtstag"
          type="date"
          value={values.birthday}
          onChange={(e) => set('birthday', e.target.value)}
          error={fieldError('birthday')}
        />
        <TextField
          label="Ferienanspruch"
          required
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          hint="Tage pro Jahr"
          value={values.vacationDaysPerYear}
          onChange={(e) => set('vacationDaysPerYear', e.target.value)}
          error={fieldError('vacationDaysPerYear')}
        />
      </div>

      <fieldset className={styles.colorPicker} aria-describedby={`${id}-color-message`}>
        <legend className={styles.legend}>Farbe</legend>
        <div className={styles.swatches}>
          {COLOR_SUGGESTIONS.map((suggestion) => {
            const owner = takenColors.get(suggestion.value)
            return (
              <label
                key={suggestion.value}
                className={styles.swatch}
                style={{ backgroundColor: suggestion.value }}
                title={owner ? `${suggestion.name} – hat bereits ${owner}` : suggestion.name}
              >
                <input
                  type="radio"
                  name={`${id}-color`}
                  value={suggestion.value}
                  checked={values.color.toLowerCase() === suggestion.value}
                  onChange={() => set('color', suggestion.value)}
                  aria-label={owner ? `${suggestion.name} (hat bereits ${owner})` : suggestion.name}
                />
                {owner && <span className={styles.taken} aria-hidden />}
              </label>
            )
          })}
          <label className={`${styles.custom} ${isCustomColor ? styles.customActive : ''}`} title="Eigene Farbe wählen">
            <input type="color" value={values.color} onChange={(e) => set('color', e.target.value)} aria-label="Eigene Farbe" />
            Eigene
          </label>
        </div>
        <div id={`${id}-color-message`} className={styles.preview}>
          <NameBadge name={values.name.trim() || 'Vorschau'} color={values.color} />
          {fieldError('color') ? (
            <span className={styles.error} role="alert">
              {fieldError('color')}
            </span>
          ) : (
            colorOwner && <span className={styles.warning}>Diese Farbe hat bereits {colorOwner}.</span>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Erscheint bei</legend>
        <Checkbox
          label="Terminen – als Mechaniker wählbar"
          checked={values.selectableAsMechanic}
          onChange={(e) => set('selectableAsMechanic', e.target.checked)}
        />
        <Checkbox
          label="To-dos und Notizen – als zuständige Person wählbar"
          checked={values.selectableForTodos}
          onChange={(e) => set('selectableForTodos', e.target.checked)}
        />
        <Checkbox label="Pinnwand – mit eigener Spalte" checked={values.hasPinboardColumn} onChange={(e) => set('hasPinboardColumn', e.target.checked)} />
      </fieldset>
    </form>
  )
}
