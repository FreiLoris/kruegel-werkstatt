import { Checkbox, TextField } from '../../components/ui/Fields'
import type { Season, TreadLimits } from './tireHotelApi'
import { depthsOf, depthWarning, parseDepth, withDepth, withSameDepth, type TireSetErrors, type TireSetForm } from './tireSetForm'
import { treadStatus, WHEELS } from './tread'
import styles from './TreadDepths.module.css'
import { AdviseBanner, TreadChip } from './TreadDepthsView'

/**
 * The tread depths as entered with the gauge: "Alle vier gleich" (one field – a new set has the
 * same depth everywhere) or each wheel around the car. The status shows right away, and the hint
 * to talk to the customer when one is below the limit of the settings.
 */
export function TreadDepthsInput({
  form,
  onChange,
  errors,
  limits,
}: {
  form: TireSetForm
  onChange: (form: TireSetForm) => void
  errors: TireSetErrors
  limits: TreadLimits | undefined
}) {
  const season: Season = form.season || 'WINTER'
  const depths = depthsOf(form)
  // no status next to an invalid value – the error says what is wrong
  const status = (wheel: (typeof WHEELS)[number]['key']) =>
    limits && !errors[wheel] && depths[wheel] !== undefined ? treadStatus(depths[wheel], season, limits) : undefined
  const warning = (wheel: (typeof WHEELS)[number]['key']) => depthWarning(parseDepth(form.depths[wheel]))

  return (
    <>
      <Checkbox label="Alle vier gleich" checked={form.sameDepth} onChange={(e) => onChange(withSameDepth(form, e.target.checked))} />
      {form.sameDepth ? (
        <div className={`${styles.wheel} ${styles.single}`}>
          <TextField
            label="Profiltiefe in mm (alle vier)"
            inputMode="decimal"
            placeholder="z. B. 6,5"
            autoComplete="off"
            value={form.depths.frontLeft}
            onChange={(e) => onChange(withDepth(form, 'frontLeft', e.target.value))}
            error={errors.frontLeft}
            hint={warning('frontLeft')}
          />
          {status('frontLeft') && <TreadChip status={status('frontLeft')!} />}
        </div>
      ) : (
        <div className={styles.car}>
          <span className={styles.body} aria-hidden>
            vorne
          </span>
          {WHEELS.map((wheel, index) => (
            <div key={wheel.key} className={[styles.wheel, index % 2 === 1 && styles.right].filter(Boolean).join(' ')}>
              <TextField
                label={`${wheel.short} – ${wheel.label}`}
                inputMode="decimal"
                placeholder="mm"
                autoComplete="off"
                value={form.depths[wheel.key]}
                onChange={(e) => onChange(withDepth(form, wheel.key, e.target.value))}
                error={errors[wheel.key]}
                hint={warning(wheel.key)}
              />
              {status(wheel.key) && <TreadChip status={status(wheel.key)!} />}
            </div>
          ))}
        </div>
      )}
      {limits && <AdviseBanner depths={depths} season={season} limits={limits} />}
    </>
  )
}
