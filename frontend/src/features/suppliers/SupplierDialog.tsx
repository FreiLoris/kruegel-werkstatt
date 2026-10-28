import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Select, TextArea, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useSingleFlight } from '../../lib/useSingleFlight'
import styles from './SupplierDialog.module.css'
import { contactForm, deliveryForm, toContacts, toDeliveries, type ContactForm, type DeliveryForm } from './supplierForm'
import { ContactsEditor, DeliveriesEditor } from './SupplierLists'
import { ORDER_CHANNEL_LABEL, useDeleteSupplier, useSaveSupplier, type OrderChannel, type Supplier, type SupplierRequest } from './supplierApi'

const FIELDS = ['name', 'phone', 'email', 'webshopUrl', 'customerNumber', 'orderChannel', 'delivery', 'remark'] as const
type FormValues = Record<(typeof FIELDS)[number], string>

function initialValues(supplier?: Supplier): FormValues {
  return Object.fromEntries(FIELDS.map((field) => [field, supplier?.[field] ?? ''])) as FormValues
}

function toRequest(values: FormValues, contacts: ContactForm[], deliveries: DeliveryForm[], version?: number): SupplierRequest {
  const text = (field: keyof FormValues) => values[field].trim() || undefined
  return {
    name: values.name.trim(),
    phone: text('phone'),
    email: text('email'),
    webshopUrl: text('webshopUrl'),
    customerNumber: text('customerNumber'),
    orderChannel: (values.orderChannel || null) as OrderChannel | null,
    delivery: text('delivery'),
    remark: text('remark'),
    contacts: toContacts(contacts),
    deliveries: toDeliveries(deliveries),
    version,
  }
}

/** Add, edit or delete a supplier (FB-09). Mounted fresh on every open (`key`). */
export function SupplierDialog({ supplier, articleCount, onClose }: { supplier?: Supplier; articleCount: number; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveSupplier()
  const once = useSingleFlight()
  const remove = useDeleteSupplier()
  const [values, setValues] = useState(() => initialValues(supplier))
  const [contacts, setContacts] = useState<ContactForm[]>(() => supplier?.contacts.map(contactForm) ?? [])
  const [deliveries, setDeliveries] = useState<DeliveryForm[]>(() => supplier?.deliveries.map(deliveryForm) ?? [])

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    once((done) =>
      save.mutate(
        { id: supplier?.id, request: toRequest(values, contacts, deliveries, supplier?.version) },
        {
          onSettled: done,
          onSuccess: (saved) => {
            toast.success(`${saved.name} gespeichert`)
            onClose()
          },
          onError: (error) => {
            // Only an existing supplier can have been changed elsewhere; a 409 while creating (same name
            // created on another device at the same time) keeps the input and shows the server's reason
            if (supplier && error instanceof ApiError && error.isVersionConflict) {
              toast.error(`${supplier.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
              onClose()
            } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
              toast.error(`Speichern fehlgeschlagen: ${error.message}`)
            }
          },
        },
      ),
    )
  }

  async function deleteSupplier() {
    if (!supplier) return
    const ok = await confirm({
      title: `${supplier.name} löschen?`,
      text:
        articleCount > 0
          ? `${articleCount === 1 ? 'Ein Artikel' : `${articleCount} Artikel`} im Lager verlieren diesen Lieferanten. Das lässt sich nicht rückgängig machen.`
          : 'Das lässt sich nicht rückgängig machen.',
      confirmLabel: 'Löschen',
    })
    if (!ok) return
    remove.mutate(supplier.id, {
      onSuccess: () => {
        toast.success(`${supplier.name} gelöscht`)
        onClose()
      },
      onError: (error) => toast.error(`${supplier.name}: ${error.message}`),
    })
  }

  const field = (name: keyof FormValues, label: string, props: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField label={label} autoComplete="off" value={values[name]} onChange={(e) => set(name, e.target.value)} error={fieldError(name)} {...props} />
  )

  return (
    <Modal
      open
      onClose={onClose}
      // contacts and ways of delivery side by side need the room (FB-30)
      wide
      title={supplier ? `${supplier.name} bearbeiten` : 'Neuer Lieferant'}
      footer={
        <>
          {supplier && (
            <Button variant="ghost" icon={Trash2} onClick={deleteSupplier} loading={remove.isPending} className={styles.left}>
              Löschen
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
        {field('name', 'Firma', { required: true, maxLength: 100, placeholder: 'z. B. Muster Teile AG' })}
        {field('customerNumber', 'Unsere Kundennummer', { maxLength: 60, hint: 'Unsere Nummer beim Lieferanten' })}
        <div className={styles.row}>
          {field('phone', 'Telefon Zentrale', { type: 'tel', maxLength: 40 })}
          {field('email', 'E-Mail Zentrale', { type: 'email', maxLength: 100 })}
        </div>
        <ContactsEditor
          contacts={contacts}
          onChange={(next) => {
            setContacts(next)
            if (save.error) save.reset()
          }}
          errorAt={(i) => fieldError(`contacts[${i}]`) ?? fieldError(`contacts[${i}].email`)}
        />
        {field('webshopUrl', 'Webshop', { maxLength: 300, placeholder: 'z. B. shop.example.ch' })}
        <div className={styles.row}>
          <Select label="Bestellweg" value={values.orderChannel} onChange={(e) => set('orderChannel', e.target.value)} error={fieldError('orderChannel')}>
            <option value="">–</option>
            {Object.entries(ORDER_CHANNEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {field('delivery', 'Lieferzeit – Bemerkung', { maxLength: 100, placeholder: 'z. B. 5× täglich' })}
        </div>
        <DeliveriesEditor
          deliveries={deliveries}
          onChange={(next) => {
            setDeliveries(next)
            if (save.error) save.reset()
          }}
          errorAt={(i) => fieldError(`deliveries[${i}].kind`) ?? fieldError(`deliveries[${i}].postage`) ?? fieldError(`deliveries[${i}]`)}
        />
        <TextArea label="Bemerkung" rows={2} maxLength={1000} value={values.remark} onChange={(e) => set('remark', e.target.value)} error={fieldError('remark')} />
      </form>
    </Modal>
  )
}
