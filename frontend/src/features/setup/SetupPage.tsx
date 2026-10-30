import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { unsavedChanges } from '../../app/unsavedChanges'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { CompanySettings } from '../company/CompanySettings'
import { DataImport } from '../dataimport/DataImport'
import { useCompany, useCompleteSetup } from '../company/companyApi'
import { EmployeeList } from '../employees/EmployeesPage'
import { InspectionStationSettings } from '../inspection-stations/InspectionStationSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { useModuleOn } from '../modules/moduleApi'
import { ModuleSettingsForm } from '../modules/ModuleSettingsForm'
import { PublicHolidaySettingsForm } from '../publicholidays/PublicHolidaySettingsForm'
import styles from './SetupPage.module.css'

interface Step {
  /** In the address (`?step=`) – a name, not a position: the steps change with the modules */
  key: string
  title: string
  content: ReactNode
}

/**
 * A new installation, step by step (neutral 4): the settings a workshop needs before the first task,
 * the same forms as in "Einstellungen". The step stands in the address – creating the first person
 * shows "Wer benutzt dieses Gerät?" in between, afterwards it goes on here.
 */
export function SetupPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const complete = useCompleteSetup()
  const mfkOn = useModuleOn('MFK')
  const canEdit = useCanEdit()
  const { data: company } = useCompany()

  const steps: Step[] = [
    { key: 'company', title: 'Firma', content: <CompanySettings /> },
    { key: 'modules', title: 'Module', content: <ModuleSettingsForm /> },
    { key: 'holidays', title: 'Feiertage', content: <PublicHolidaySettingsForm /> },
    { key: 'lifts', title: 'Lifte', content: <LiftSettings /> },
    ...(mfkOn ? [{ key: 'inspection-stations', title: 'Prüfstellen', content: <InspectionStationSettings /> }] : []),
    // with the first person the device asks who uses it – the import after it needs that person
    { key: 'employees', title: 'Mitarbeiter', content: <EmployeeList /> },
    {
      key: 'data-import',
      title: 'Kunden übernehmen',
      content: (
        <>
          <h2>Kunden und Fahrzeuge übernehmen</h2>
          <p className="muted">
            Freiwillig: aus dem bisherigen Programm als CSV- oder Excel-Datei. Geht auch später unter «Einstellungen».
          </p>
          <DataImport />
        </>
      ),
    },
  ]
  const index = Math.max(0, steps.findIndex((s) => s.key === params.get('step')))
  const step = steps[index]
  const last = index === steps.length - 1

  /**
   * The steps share one address – the guard of the layout only asks when the page changes. Typed but not
   * saved ("Weiter" without "Speichern") is asked here, as on leaving a page.
   */
  async function mayLeaveStep(): Promise<boolean> {
    if (!unsavedChanges.any()) return true
    const discard = await confirm({
      title: 'Eingaben verwerfen?',
      text: 'Was in diesem Schritt eingegeben wurde, ist noch nicht gespeichert. Erst «Speichern» – oder verwerfen?',
      confirmLabel: 'Verwerfen',
      cancelLabel: 'Weiter bearbeiten',
      dangerous: true,
    })
    if (discard) unsavedChanges.clear()
    return discard
  }

  async function go(to: number) {
    if (!(await mayLeaveStep())) return
    setParams({ step: steps[to].key }, { replace: true })
    window.scrollTo(0, 0)
  }

  async function finish() {
    if (!(await mayLeaveStep())) return
    complete.mutate(undefined, {
      onSuccess: () => {
        toast.success('Eingerichtet – alles lässt sich später in den Einstellungen ändern')
        navigate('/', { replace: true })
      },
      onError: (error) => toast.error(`Nicht gespeichert: ${error.message}`),
    })
  }

  // done on another device: nothing more to set up here
  if (company?.setupDone) return <Navigate to="/" replace />

  return (
    <div className={styles.setup}>
      <h1>Willkommen – die App einrichten</h1>
      <p className="muted">
        Ein paar Angaben, bevor es losgeht. Jeder Schritt wird für sich gespeichert; alles lässt sich später unter «Einstellungen» ändern.
      </p>
      <ol className={styles.steps} aria-label="Schritte">
        {steps.map((s, i) => (
          <li key={s.key} aria-current={i === index ? 'step' : undefined} className={i === index ? styles.current : undefined}>
            <button type="button" className={styles.stepButton} onClick={() => void go(i)}>
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>
      <section className={styles.content} aria-label={step.title}>
        {step.content}
      </section>
      <div className={styles.actions}>
        {index > 0 && (
          <Button icon={ArrowLeft} onClick={() => void go(index - 1)}>
            Zurück
          </Button>
        )}
        {!last && (
          <Button variant="primary" icon={ArrowRight} onClick={() => void go(index + 1)}>
            Weiter
          </Button>
        )}
        {/* a device on "Nur ansehen" may not end it – the server would refuse */}
        {canEdit && last && (
          <Button variant="primary" icon={Check} loading={complete.isPending} onClick={() => void finish()}>
            Fertig
          </Button>
        )}
        {canEdit && (
          <Button variant="ghost" onClick={() => void finish()} disabled={complete.isPending}>
            Später einrichten
          </Button>
        )}
      </div>
    </div>
  )
}
