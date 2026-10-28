import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { CODE_PATTERN, normalizeCode, suggestCode } from './storageCode'
import styles from './StorageLocationSettings.module.css'

interface StorageLocationDialogProps {
  title: string
  /** when editing: what it is called and its code */
  initial?: { name: string; code: string | null }
  /** FB-23: the code of the nearest place above – one without its own shows that one */
  inheritedCode?: string
  /** every code in use on the premises – for the proposal */
  usedCodes: string[]
  placeholder: string
  save: (values: { name: string; code: string | null }) => Promise<{ name: string }>
  onClose: () => void
}

/**
 * A storage location: its name and – FB-23 – its code to write on the shelf (AA00, e.g. KA01). The
 * code is proposed (the next free one of the area or place typed, else of the place above), stays
 * changeable, and may stay empty: then the code of the place above counts.
 */
export function StorageLocationDialog({ title, initial, inheritedCode, usedCodes, placeholder, save, onClose }: StorageLocationDialogProps) {
  const formId = useId()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({})
  const [loading, setLoading] = useState(false)

  const typed = normalizeCode(code)
  const codeInvalid = typed !== '' && !CODE_PATTERN.test(typed)
  // "K" typed to get the proposal is still typing – said only when saving
  const [triedToSave, setTriedToSave] = useState(false)
  // the place above gives its letters when nothing is typed: a drawer in KA01 gets KA02
  const others = usedCodes.filter((c) => c !== initial?.code)
  // a complete code not taken is left alone – a labelled shelf is not renumbered
  const proposal = CODE_PATTERN.test(typed) && !others.includes(typed) ? null : suggestCode(typed || (inheritedCode ?? '').slice(0, 2), others)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTriedToSave(true)
    if (codeInvalid) return
    setLoading(true)
    try {
      const saved = await save({ name, code: typed || null })
      toast.success(`${saved.name} gespeichert`)
      onClose()
    } catch (error) {
      const field = (key: string) => (error instanceof ApiError ? error.messageForField(key) : undefined)
      if (initial && error instanceof ApiError && error.isVersionConflict) {
        toast.error(`${initial.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
        onClose()
      } else if (field('name') || field('code')) {
        setErrors({ name: field('name'), code: field('code') })
      } else {
        toast.error(`Speichern fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={loading}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(e) => void submit(e)}>
        <TextField
          label="Name"
          required
          placeholder={placeholder}
          hint="So erscheint der Lagerort in der Lagerliste."
          maxLength={40}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors({ ...errors, name: undefined })
          }}
          error={errors.name}
        />
        <div className={styles.codeRow}>
          <TextField
            label="Kürzel (zum Anschreiben)"
            placeholder={inheritedCode ? `leer = ${inheritedCode}` : 'z. B. KA01'}
            hint={
              inheritedCode
                ? `Leer lassen: es gilt ${inheritedCode} des übergeordneten Orts.`
                : '2 Buchstaben + 2 Ziffern: Bereich, Lagerort, Platz – z. B. K eingeben für den nächsten freien im Keller.'
            }
            maxLength={6}
            autoComplete="off"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setErrors({ ...errors, code: undefined })
            }}
            error={codeInvalid && triedToSave ? '2 Buchstaben und 2 Ziffern, z. B. KA01' : errors.code}
          />
          {proposal && proposal !== typed && (
            <Button small onClick={() => setCode(proposal)}>
              Vorschlag {proposal}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
