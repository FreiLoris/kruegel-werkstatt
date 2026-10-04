import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Fields'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toastContext'

interface NameDialogProps {
  title: string
  /** Current name when renaming, empty when creating */
  initialName?: string
  placeholder: string
  hint: string
  maxLength: number
  /** Saves and returns the saved entry – throws on errors (e.g. `mutateAsync`) */
  save: (name: string) => Promise<{ name: string }>
  onClose: () => void
}

/**
 * Dialog with a single field "Name" – for master data such as lifts or service items.
 * Field errors (name already taken) appear at the field, everything else as a message.
 * Mounted fresh on every open (`key`), so no old text stays behind.
 */
export function NameDialog({ title, initialName = '', placeholder, hint, maxLength, save, onClose }: NameDialogProps) {
  const formId = useId()
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [fieldError, setFieldError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const saved = await save(name)
      toast.success(`${saved.name} gespeichert`)
      onClose()
    } catch (error) {
      const message = error instanceof ApiError ? error.messageForField('name') : undefined
      if (error instanceof ApiError && error.isConflict) {
        toast.error(`${initialName} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
        onClose()
      } else if (message) {
        setFieldError(message)
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
          hint={hint}
          maxLength={maxLength}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setFieldError(undefined)
          }}
          error={fieldError}
        />
      </form>
    </Modal>
  )
}
