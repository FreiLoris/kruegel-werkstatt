import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import styles from '../../components/ui/FormDialog.module.css'
import { Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useCreateCustomer, type CustomerRequest } from './customerApi'
import type { Customer } from './customerSearchApi'

type Field = Exclude<keyof CustomerRequest, 'version'>
type FormValues = Record<Field, string>

const EMPTY: FormValues = {
  salutation: '',
  firstName: '',
  lastName: '',
  company: '',
  addition: '',
  street: '',
  postalCode: '',
  city: '',
  phone: '',
  mobile: '',
  email: '',
}

/** Empty fields are left out – the backend treats them as "not set". */
function toRequest(values: FormValues): CustomerRequest {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [field, value.trim() || undefined]),
  ) as CustomerRequest
}

/**
 * Walk-in customer that is not in SwissGarage (ADR 0003: regular customers come from the import).
 * Labels above every field; placeholders only as "z. B. …" so they are not mistaken for values.
 *
 * @param initialName what was typed in the search – usually the name
 */
export function NewCustomerDialog({
  initialName = '',
  onCreated,
  onClose,
}: {
  initialName?: string
  onCreated: (customer: Customer) => void
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const create = useCreateCustomer()
  const [values, setValues] = useState<FormValues>({ ...EMPTY, lastName: initialName.trim() })

  const fieldError = (field: Field) => (create.error instanceof ApiError ? create.error.messageForField(field) : undefined)

  function set(field: Field, value: string) {
    setValues({ ...values, [field]: value })
    if (create.error) create.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(toRequest(values), {
      onSuccess: (customer) => {
        toast.success(`${customer.displayName} erfasst`)
        onCreated(customer)
      },
      onError: (error) => {
        if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
          toast.error(`Speichern fehlgeschlagen: ${error.message}`)
        }
      },
    })
  }

  const text = (field: Field, label: string, props: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField
      label={label}
      autoComplete="off"
      maxLength={100}
      value={values[field]}
      onChange={(e) => set(field, e.target.value)}
      error={fieldError(field)}
      {...props}
    />
  )

  return (
    <Modal
      open
      onClose={onClose}
      title="Neuer Kunde"
      wide
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={create.isPending}>
            Kunde erfassen
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        <p className={styles.note}>
          Für Laufkundschaft. Stammkunden kommen aus SwissGarage – ist der Kunde dort schon erfasst, erscheint er nach
          dem nächsten Import in der Suche.
        </p>
        <div className={styles.row}>
          <Select label="Anrede" value={values.salutation} onChange={(e) => set('salutation', e.target.value)}>
            <option value="">–</option>
            <option>Herr</option>
            <option>Frau</option>
          </Select>
          {text('firstName', 'Vorname')}
          <TextField
            label="Nachname"
            data-autofocus
            hint="Nachname oder Firma ist nötig"
            autoComplete="off"
            maxLength={100}
            value={values.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            error={fieldError('lastName')}
          />
        </div>
        <div className={styles.row}>
          {text('company', 'Firma')}
          {text('addition', 'Zusatz', { placeholder: 'z. B. z. Hd. Frau Keller' })}
        </div>
        <div className={styles.row}>
          {text('street', 'Strasse')}
          {text('postalCode', 'PLZ', { maxLength: 10, inputMode: 'numeric' })}
          {text('city', 'Ort')}
        </div>
        <div className={styles.row}>
          {text('mobile', 'Handy', { type: 'tel', placeholder: 'z. B. 079 123 45 67' })}
          {text('phone', 'Telefon', { type: 'tel' })}
          {text('email', 'E-Mail', { type: 'email' })}
        </div>
      </form>
    </Modal>
  )
}
