import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { unsavedChanges } from '../../app/unsavedChanges'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { CompanySettings } from '../company/CompanySettings'
import { useCompleteSetup } from '../company/companyApi'
import { EmployeeList } from '../employees/EmployeesPage'
import { InspectionStationSettings } from '../inspection-stations/InspectionStationSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { useModuleOn } from '../modules/moduleApi'
import { ModuleSettingsForm } from '../modules/ModuleSettingsForm'
import { PublicHolidaySettingsForm } from '../publicholidays/PublicHolidaySettingsForm'
import styles from './SetupPage.module.css'

interface Step {
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

  const steps: Step[] = [
    { title: 'Firma', content: <CompanySettings /> },
    { title: 'Module', content: <ModuleSettingsForm /> },
    { title: 'Feiertage', content: <PublicHolidaySettingsForm /> },
    { title: 'Lifte', content: <LiftSettings /> },
    ...(mfkOn ? [{ title: 'Prüfstellen', content: <InspectionStationSettings /> }] : []),
    // last: with the first person the device asks who uses it
    { title: 'Mitarbeiter', content: <EmployeeList /> },
  ]
  const requested = Number(params.get('step') ?? '0')
  const index = Number.isInteger(requested) && requested >= 0 && requested < steps.length ? requested : 0
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
    setParams({ step: String(to) }, { replace: true })
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

  return (
    <div className={styles.setup}>
      <h1>Willkommen – die App einrichten</h1>
      <p className="muted">
        Ein paar Angaben, bevor es losgeht. Jeder Schritt wird für sich gespeichert; alles lässt sich später unter «Einstellungen» ändern.
      </p>
      <ol className={styles.steps} aria-label="Schritte">
        {steps.map((s, i) => (
          <li key={s.title} aria-current={i === index ? 'step' : undefined} className={i === index ? styles.current : undefined}>
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
        {last ? (
          <Button variant="primary" icon={Check} loading={complete.isPending} onClick={() => void finish()}>
            Fertig
          </Button>
        ) : (
          <Button variant="primary" icon={ArrowRight} onClick={() => void go(index + 1)}>
            Weiter
          </Button>
        )}
        <Button variant="ghost" onClick={() => void finish()} disabled={complete.isPending}>
          Später einrichten
        </Button>
      </div>
    </div>
  )
}
