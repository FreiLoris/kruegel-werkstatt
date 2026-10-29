import { useRef } from 'react'
import { Button } from '../../components/ui/Button'
import { TextArea } from '../../components/ui/Fields'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useSmsPreview, type ReminderSettings } from './reminderApi'
import styles from './SmsTemplateField.module.css'

interface SmsTemplateFieldProps {
  value: string
  onChange: (value: string) => void
  settings: Pick<ReminderSettings, 'placeholders' | 'standardTemplate'>
  disabled: boolean
  error?: string
}

/**
 * The SMS wording (17e): placeholders to insert where the cursor is, the standard text back with one
 * click, and next to it the SMS as an example customer gets it – with what it costs.
 */
export function SmsTemplateField({ value, onChange, settings, disabled, error }: SmsTemplateFieldProps) {
  const area = useRef<HTMLTextAreaElement>(null)
  const { data: preview } = useSmsPreview(useDebouncedValue(value, 400))

  function insert(placeholder: string) {
    const field = area.current
    const text = `{${placeholder}}`
    const at = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? at
    onChange(value.slice(0, at) + text + value.slice(end))
    // back into the field, behind what was inserted
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(at + text.length, at + text.length)
    })
  }

  return (
    <div className={styles.columns}>
      <div>
        <TextArea
          ref={area}
          label="SMS-Text"
          rows={12}
          maxLength={600}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          hint="Eine Zeile mit einem leeren Platzhalter (kein Kennzeichen) wird weggelassen."
        />
        {!disabled && (
          <div className={styles.buttons}>
            {settings.placeholders.map((placeholder) => (
              <Button key={placeholder} small onClick={() => insert(placeholder)}>
                {`{${placeholder}}`}
              </Button>
            ))}
            <Button small variant="ghost" disabled={value === settings.standardTemplate} onClick={() => onChange(settings.standardTemplate)}>
              Standardtext
            </Button>
          </div>
        )}
      </div>
      <div>
        <span className={styles.label}>So kommt sie an (Beispiel)</span>
        <div className={styles.bubble}>{preview?.text ?? '…'}</div>
        {preview && (
          <p className="muted">
            {preview.characters} Zeichen = {preview.parts === 1 ? '1 SMS' : `${preview.parts} SMS (jede wird bezahlt)`}
          </p>
        )}
        {preview && preview.unknown.length > 0 && (
          <p className={styles.warning}>Unbekannt: {preview.unknown.join(', ')} – so kann nicht gespeichert werden.</p>
        )}
        {preview && preview.replaced.length > 0 && (
          <p className={styles.warning}>Nicht im SMS-Zeichensatz, wird ersetzt: {preview.replaced.join(' ')}</p>
        )}
      </div>
    </div>
  )
}
