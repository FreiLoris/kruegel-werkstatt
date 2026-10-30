import { ImageUp, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import formStyles from '../../components/ui/FormDialog.module.css'
import { Select, TextField } from '../../components/ui/Fields'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { CANTONS } from '../../lib/licensePlate'
import styles from './CompanySettings.module.css'
import { useCompany, useDeleteLogo, useUpdateCompany, useUploadLogo, type Company, type CompanyRequest } from './companyApi'

type Field = Exclude<keyof CompanyRequest, 'version'>
type FormValues = Record<Field, string>

function initialValues(company: Company): FormValues {
  return {
    name: company.name,
    street: company.street ?? '',
    postalCode: company.postalCode ?? '',
    city: company.city ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    website: company.website ?? '',
    plateCanton: company.plateCanton,
  }
}

/**
 * Name, address and logo of the workshop – shown in the navigation and as letterhead on the
 * task sheet.
 */
export function CompanySettings() {
  const { data: company, error, isPending } = useCompany()

  if (isPending) return <p className="muted">Lade Firmendaten …</p>
  if (error) return <p className="muted">Firmendaten konnten nicht geladen werden: {error.message}</p>

  return (
    <>
      <h2>Firma</h2>
      <p className="muted">Erscheint oben in der Navigation und als Briefkopf auf dem Auftragszettel.</p>
      <div className={styles.layout}>
        <CompanyForm company={company} />
        <LogoEditor company={company} />
      </div>
    </>
  )
}

function CompanyForm({ company }: { company: Company }) {
  const canEdit = useCanEdit()
  const toast = useToast()
  const update = useUpdateCompany()
  const [values, setValues] = useState(() => initialValues(company))
  // The version the form is based on: from opening, then from our own saves. Not the live one –
  // a change from another device must give a conflict instead of being overwritten (and a live
  // update must not reset what is being typed).
  const [baseVersion, setBaseVersion] = useState(company.version)
  // what is stored as far as this form knows – leaving with other values asks first (UX G-02)
  const [savedValues, setSavedValues] = useState(values)
  const [conflict, setConflict] = useState(false)
  useUnsavedChanges(JSON.stringify(values) !== JSON.stringify(savedValues))

  const fieldError = (field: Field) => (update.error instanceof ApiError ? update.error.messageForField(field) : undefined)

  function set(field: Field, value: string) {
    setValues({ ...values, [field]: value })
    if (update.error) update.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = (value: string) => value.trim() || undefined
    update.mutate(
      {
        name: values.name.trim(),
        street: text(values.street),
        postalCode: text(values.postalCode),
        city: text(values.city),
        phone: text(values.phone),
        email: text(values.email),
        website: text(values.website),
        plateCanton: values.plateCanton,
        version: baseVersion,
      },
      {
        onSuccess: (saved) => {
          setBaseVersion(saved.version)
          setSavedValues(values)
          setConflict(false)
          toast.success('Firmendaten gespeichert')
        },
        onError: (e) => {
          if (e instanceof ApiError && e.isVersionConflict) {
            setConflict(true)
          } else if (!(e instanceof ApiError && (e.problem.errors?.length ?? 0) > 0)) {
            toast.error(`Speichern fehlgeschlagen: ${e.message}`)
          }
        },
      },
    )
  }

  const text = (field: Field, label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField
      label={label}
      autoComplete="off"
      disabled={!canEdit}
      value={values[field]}
      onChange={(e) => set(field, e.target.value)}
      error={fieldError(field)}
      {...extra}
    />
  )

  return (
    <form className={formStyles.form} onSubmit={submit}>
      {conflict && (
        <div className={styles.conflict} role="alert">
          <p>
            Die Firmendaten wurden inzwischen auf einem anderen Gerät geändert. Deine Eingaben bleiben stehen: Du kannst sie
            übernehmen und speichern – sie ersetzen dann die Änderung vom anderen Gerät. Oder den aktuellen Stand laden.
          </p>
          <div className={styles.conflictActions}>
            <Button
              variant="primary"
              onClick={() => {
                setBaseVersion(company.version)
                setConflict(false)
              }}
            >
              Meine Eingaben übernehmen
            </Button>
            <Button
              onClick={() => {
                setValues(initialValues(company))
                setSavedValues(initialValues(company))
                setBaseVersion(company.version)
                setConflict(false)
              }}
            >
              Aktuellen Stand laden
            </Button>
          </div>
        </div>
      )}
      {text('name', 'Firmenname', { required: true, maxLength: 60 })}
      {text('street', 'Strasse', { maxLength: 100 })}
      <div className={formStyles.row}>
        {text('postalCode', 'PLZ', { maxLength: 10, inputMode: 'numeric' })}
        {text('city', 'Ort', { maxLength: 60 })}
      </div>
      <div className={formStyles.row}>
        {text('phone', 'Telefon', { type: 'tel', maxLength: 30 })}
        {text('email', 'E-Mail', { type: 'email', maxLength: 100 })}
      </div>
      {text('website', 'Webseite', { maxLength: 100, placeholder: 'z. B. www.example.ch' })}
      {/* neutral 4: where the workshop is – a new licence plate starts with it */}
      <Select
        label="Kanton für neue Kontrollschilder"
        disabled={!canEdit}
        value={values.plateCanton}
        onChange={(e) => set('plateCanton', e.target.value)}
        error={fieldError('plateCanton')}
      >
        {CANTONS.map((canton) => (
          <option key={canton.code} value={canton.code}>
            {canton.code} – {canton.name}
          </option>
        ))}
      </Select>
      {canEdit && (
        <div>
          <Button variant="primary" type="submit" loading={update.isPending}>
            Speichern
          </Button>
        </div>
      )}
    </form>
  )
}

function LogoEditor({ company }: { company: Company }) {
  const canEdit = useCanEdit()
  const toast = useToast()
  const confirm = useConfirm()
  const upload = useUploadLogo()
  const remove = useDeleteLogo()

  const uploadError = upload.error instanceof ApiError ? (upload.error.messageForField('file') ?? upload.error.message) : null

  function choose(file: File | undefined) {
    if (!file) return
    upload.mutate(file, { onSuccess: () => toast.success('Logo gespeichert') })
  }

  async function removeLogo() {
    if (!(await confirm({ title: 'Logo entfernen?', text: 'Navigation und Auftragszettel zeigen danach nur den Namen.', confirmLabel: 'Entfernen', dangerous: true }))) {
      return
    }
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Logo entfernt'),
      onError: (e) => toast.error(`Entfernen fehlgeschlagen: ${e.message}`),
    })
  }

  return (
    <div className={styles.logo}>
      <p className={styles.logoLabel}>Logo</p>
      {/* white like the paper: most logos are made for white backgrounds */}
      <div className={styles.preview}>
        {company.logoUrl ? <img src={company.logoUrl} alt={`Logo ${company.name}`} /> : <span>Noch kein Logo</span>}
      </div>
      <p className={styles.hint}>PNG, JPG, WebP oder SVG, höchstens 1 MB. Am besten mit transparentem oder weissem Hintergrund.</p>
      {uploadError && (
        <p className={styles.error} role="alert">
          {uploadError}
        </p>
      )}
      {canEdit && (
        <div className={styles.actions}>
          <label className={styles.upload}>
            <ImageUp aria-hidden />
            {company.logoUrl ? 'Anderes Logo hochladen' : 'Logo hochladen'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={upload.isPending}
              onChange={(e) => {
                choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {company.logoUrl && (
            <Button variant="ghost" icon={Trash2} onClick={removeLogo} loading={remove.isPending}>
              Entfernen
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
