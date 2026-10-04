import { useId, useState } from 'react'
import { CANTONS, COUNTRIES, composePlate, parsePlate, type ParsedPlate } from '../../lib/licensePlate'
import { Select, TextField } from '../ui/Fields'
import { LicensePlate } from './LicensePlate'
import styles from './LicensePlateField.module.css'

/** Value of the "Land" selection: Switzerland, a foreign country code or free input */
type Country = 'CH' | 'OTHER' | string

/** Canton for new plates – the workshop is in the canton of Zurich */
const DEFAULT_CANTON = 'ZH'

interface LicensePlateFieldProps {
  /** Stored plate text, e.g. "SG 197052" ('' = none) */
  value: string
  onChange: (value: string) => void
  /** Error from the server, e.g. "gehört bereits zu einem anderen Ersatzwagen" */
  error?: string
}

/**
 * License plate input in parts: country → canton → number, with a live preview of the plate.
 * Swiss plates: canton from the list, number digits only (max. 6). Foreign plates: country code +
 * free number. "Andere" for anything else (e.g. old data in an unusual form).
 *
 * The parts live in local state – a half-filled plate (canton chosen, no number yet) is not
 * a plate and is reported as '' – the component is mounted fresh for every dialog (`key`).
 */
export function LicensePlateField({ value, onChange, error }: LicensePlateFieldProps) {
  const id = useId()
  const [plate, setPlate] = useState<ParsedPlate>(() =>
    value ? parsePlate(value) : { kind: 'swiss', canton: DEFAULT_CANTON, number: '' },
  )

  const country: Country = plate.kind === 'swiss' ? 'CH' : plate.kind === 'foreign' ? plate.country : 'OTHER'
  const composed = composePlate(plate)

  function update(next: ParsedPlate) {
    setPlate(next)
    onChange(composePlate(next))
  }

  function changeCountry(next: Country) {
    if (next === 'CH') update({ kind: 'swiss', canton: DEFAULT_CANTON, number: '' })
    else if (next === 'OTHER') update({ kind: 'other', text: '' })
    else update({ kind: 'foreign', country: next, number: plate.kind === 'foreign' ? plate.number : '' })
  }

  return (
    <fieldset className={styles.field} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={styles.legend}>Kennzeichen</legend>
      <div className={styles.parts}>
        <Select label="Land" value={country} onChange={(e) => changeCountry(e.target.value)}>
          <option value="CH">Schweiz</option>
          <optgroup label="Ausland">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} – {c.name}
              </option>
            ))}
          </optgroup>
          <option value="OTHER">Andere / freie Eingabe</option>
        </Select>

        {plate.kind === 'swiss' && (
          <>
            <Select label="Kanton" value={plate.canton} onChange={(e) => update({ ...plate, canton: e.target.value })}>
              {CANTONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} – {c.name}
                </option>
              ))}
            </Select>
            <TextField
              label="Nummer"
              inputMode="numeric"
              autoComplete="off"
              placeholder="z. B. 123456"
              maxLength={6}
              value={plate.number}
              // Only digits – Swiss plates have no letters after the canton
              onChange={(e) => update({ ...plate, number: e.target.value.replace(/\D/g, '') })}
            />
          </>
        )}

        {plate.kind === 'foreign' && (
          <TextField
            label="Nummer"
            autoComplete="off"
            placeholder="z. B. M AB 1234"
            maxLength={15}
            value={plate.number}
            onChange={(e) => update({ ...plate, number: e.target.value.toUpperCase() })}
          />
        )}

        {plate.kind === 'other' && (
          <TextField
            label="Kennzeichen"
            autoComplete="off"
            maxLength={20}
            value={plate.text}
            onChange={(e) => update({ kind: 'other', text: e.target.value.toUpperCase() })}
          />
        )}
      </div>

      <div className={styles.preview}>
        {composed ? <LicensePlate text={composed} size="lg" /> : <span className="muted">Vorschau erscheint mit der Nummer</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
