import { PowerOff } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import styles from './InsuranceSettings.module.css'
import { useSaveInsurance, useSetInsuranceActive, type Insurance } from './insuranceApi'

interface FormValues {
  name: string
  phone: string
  email: string
}

/** Create and edit an insurance (FB-06). Mounted fresh on every open (`key`). */
export function InsuranceDialog({ insurance, onClose }: { insurance?: Insurance; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveInsurance()
  const setActive = useSetInsuranceActive()
  const [values, setValues] = useState<FormValues>({
    name: insurance?.name ?? '',
    phone: insurance?.phone ?? '',
    email: insurance?.email ?? '',
  })

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    // An old error message disappears as soon as something is corrected
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const request = {
      name: values.name.trim(),
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      version: insurance?.version,
    }
    save.mutate(
      { id: insurance?.id, request },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`${insurance?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            // Field errors appear at the field – everything else as a message
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function stopUsing() {
    if (!insurance) return
    const ok = await confirm({
      title: `${insurance.name} nicht mehr verwenden?`,
      text: `${insurance.name} ist bei neuen Versicherungsfällen nicht mehr wählbar. Bisherige Aufträge behalten sie. Unter «Nicht mehr verwendet» lässt sich das rückgängig machen.`,
      confirmLabel: 'Nicht mehr verwenden',
    })
    if (!ok) return
    setActive.mutate(
      { id: insurance.id, active: false },
      {
        onSuccess: () => {
          toast.success(`${insurance.name} wird nicht mehr verwendet`)
          onClose()
        },
        onError: (error) => toast.error(`${insurance.name}: ${error.message}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={insurance ? `${insurance.name} bearbeiten` : 'Neue Versicherung'}
      footer={
        <>
          {insurance?.active && (
            <Button variant="ghost" icon={PowerOff} onClick={stopUsing} loading={setActive.isPending} className={styles.left}>
              Nicht mehr verwenden
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        <TextField
          label="Name"
          required
          placeholder="z. B. Muster Versicherung"
          maxLength={100}
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
        />
        <TextField
          label="Telefon"
          hint="Wird beim Versicherungsfall auf den Auftragszettel gedruckt."
          type="tel"
          maxLength={40}
          autoComplete="off"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={fieldError('phone')}
        />
        <TextField
          label="E-Mail"
          type="email"
          maxLength={100}
          autoComplete="off"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={fieldError('email')}
        />
      </form>
    </Modal>
  )
}
