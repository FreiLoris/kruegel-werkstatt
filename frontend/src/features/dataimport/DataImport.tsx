import { FileSpreadsheet, FlaskConical, LoaderCircle, Upload } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Checkbox, Select } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import styles from './DataImport.module.css'
import {
  useImportData,
  useImportPreview,
  type ImportField,
  type ImportPreview,
  type ImportResult,
  type ImportSettings,
  type ReadOptions,
} from './dataImportApi'
import { FIELD_GROUPS, mappingProblems, rememberedMapping, rememberMapping, resultText, rowsText, type Mapping } from './importFields'

/** The choice "found out from the file" – the backend gets `null` */
const AUTO_CHARSET = ''
/** The choice "not taken over" – in the mapping `null` */
const NOT_TAKEN = ''
const CHARSET_LABELS: Record<string, string> = { 'UTF-8': 'UTF-8', 'windows-1252': 'Windows (ANSI)' }

/** A dry run and what it was run with – "Jetzt übernehmen" only for exactly these settings */
interface DryRun {
  settings: string
  result: ImportResult
}

/**
 * Customers and vehicles from the file of another program (neutral 5): choose the file, say which
 * column is what, look at the dry run, take over. On its own page in "Einstellungen" and in the
 * setup assistant.
 */
export function DataImport() {
  const canEdit = useCanEdit()
  const toast = useToast()
  const preview = useImportPreview()
  const importData = useImportData()
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<ReadOptions>({ charset: null, firstRowIsData: false })
  // own state, not `preview.data`: while the file is read again the mapping stays on screen
  const [table, setTable] = useState<ImportPreview | null>(null)
  /** One entry per column, by the column's index */
  const [mapping, setMapping] = useState<Mapping>([])
  const [dryRun, setDryRun] = useState<DryRun | null>(null)
  const [done, setDone] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const problemsId = useId()

  // a file chosen but not taken over: leaving the page (or the setup step) asks first
  useUnsavedChanges(file !== null && done === null)

  const busy = preview.isPending || importData.isPending
  const settings: ImportSettings = {
    columns: mapping.flatMap((field, index) => (field ? [{ index, field }] : [])),
    charset: options.charset,
    firstRowIsData: options.firstRowIsData,
  }
  const settingsKey = JSON.stringify(settings)
  const tested = dryRun !== null && dryRun.settings === settingsKey
  const error = preview.error ?? importData.error

  function choose(chosen: File | undefined) {
    if (!chosen || busy) return
    const fresh = { charset: null, firstRowIsData: false }
    setFile(chosen)
    setOptions(fresh)
    setTable(null)
    setDone(null)
    importData.reset()
    preview.mutate(
      { file: chosen, options: fresh },
      {
        onSuccess: (result) => {
          setTable(result)
          setMapping(startMapping(result, false))
        },
        onError: () => setFile(null),
      },
    )
  }

  /** The same file read again: other character set → same columns, mapping stays; header row or not → other columns */
  function changeOptions(changed: ReadOptions) {
    if (!file || busy) return
    const before = options
    setOptions(changed)
    importData.reset()
    preview.mutate(
      { file, options: changed },
      {
        onSuccess: (result) => {
          setTable(result)
          if (changed.firstRowIsData !== before.firstRowIsData || mapping.length !== result.columns.length) {
            setMapping(startMapping(result, changed.firstRowIsData))
          }
        },
        onError: () => setOptions(before),
      },
    )
  }

  function assign(column: number, field: ImportField | null) {
    setMapping((current) => current.map((f, i) => (i === column ? field : f)))
  }

  function runDryRun() {
    if (!file) return
    const key = settingsKey
    importData.mutate({ file, settings: { ...settings, dryRun: true } }, { onSuccess: (result) => setDryRun({ settings: key, result }) })
  }

  function takeOver() {
    if (!file || !table || !tested) return
    importData.mutate(
      { file, settings: { ...settings, dryRun: false } },
      {
        onSuccess: (result) => {
          if (!options.firstRowIsData) rememberMapping(table.columns.map((c) => c.header), mapping)
          setDone(result)
          toast.success(`Übernommen: ${resultText(result)}`)
        },
      },
    )
  }

  function startOver() {
    setFile(null)
    setTable(null)
    setMapping([])
    setDryRun(null)
    setDone(null)
    preview.reset()
    importData.reset()
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (canEdit) choose(event.dataTransfer.files[0])
  }

  if (!canEdit) {
    return <p className="muted">Zum Übernehmen zuerst oben rechts eine Person wählen.</p>
  }

  if (done) {
    return (
      <div className={styles.dataImport}>
        <Result title="Übernommen" result={done} />
        <div className={styles.actions}>
          <Button icon={Upload} onClick={startOver}>
            Weitere Datei übernehmen
          </Button>
        </div>
      </div>
    )
  }

  const problems = mappingProblems(mapping)

  return (
    <div className={styles.dataImport}>
      {!file && (
        <label
          className={[styles.dropZone, dragging && styles.dragging].filter(Boolean).join(' ')}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          <FileSpreadsheet aria-hidden />
          <span>
            CSV- oder Excel-Datei hierher ziehen oder <u>auswählen</u>
          </span>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.input}
            onChange={(event) => {
              choose(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {file && !table && (
        <p className={styles.reading} role="status">
          <LoaderCircle className={styles.spinner} aria-hidden /> {file.name} wird gelesen …
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {reasonOf(error)}
        </p>
      )}

      {table && file && (
        <>
          <div className={styles.fileBar}>
            <p>
              <strong>{file.name}</strong> · {rowsText(table.rowCount)}
            </p>
            <Button small disabled={busy} onClick={startOver}>
              Andere Datei
            </Button>
          </div>

          <div className={styles.options}>
            <Checkbox
              label="Erste Zeile enthält schon Daten (keine Überschriften)"
              checked={options.firstRowIsData}
              disabled={busy}
              onChange={(event) => changeOptions({ ...options, firstRowIsData: event.target.checked })}
            />
            {table.charset && (
              <Select
                label="Zeichensatz"
                hint="Sehen Umlaute falsch aus (Ã¼ statt ü)? Den anderen wählen."
                value={options.charset ?? AUTO_CHARSET}
                disabled={busy}
                onChange={(event) => changeOptions({ ...options, charset: event.target.value || null })}
              >
                <option value={AUTO_CHARSET}>Automatisch ({CHARSET_LABELS[table.charset] ?? table.charset})</option>
                {Object.entries(CHARSET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <ColumnMapping table={table} mapping={mapping} disabled={busy} onAssign={assign} />

          {problems.length > 0 && (
            <ul id={problemsId} className={styles.mappingProblems} aria-live="polite">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          {/* a dry run of other settings is not shown – "Jetzt übernehmen" only after a dry run of exactly these */}
          {tested && <Result title="Probelauf – noch nichts gespeichert" result={dryRun.result} />}
          <div className={styles.actions}>
            {tested ? (
              <Button variant="primary" icon={Upload} loading={importData.isPending} disabled={busy} onClick={takeOver}>
                Jetzt übernehmen
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={FlaskConical}
                loading={importData.isPending}
                disabled={problems.length > 0 || busy}
                aria-describedby={problems.length > 0 ? problemsId : undefined}
                onClick={runDryRun}
              >
                Probelauf
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface ColumnMappingProps {
  table: ImportPreview
  mapping: Mapping
  disabled: boolean
  onAssign: (column: number, field: ImportField | null) => void
}

/** One choice per column of the file, with its first values */
function ColumnMapping({ table, mapping, disabled, onAssign }: ColumnMappingProps) {
  return (
    <>
      <h3>Welche Spalte ist was?</h3>
      <p className="muted">Vorgeschlagen nach den Überschriften – bitte prüfen. Spalten ohne Zuordnung werden nicht übernommen.</p>
      <ul className={styles.columns} aria-label="Spalten der Datei">
        {table.columns.map((column) => (
          <li key={column.index}>
            <Select
              label={column.header}
              hint={samplesText(column.samples)}
              value={mapping[column.index] ?? NOT_TAKEN}
              disabled={disabled}
              onChange={(event) => onAssign(column.index, (event.target.value || null) as ImportField | null)}
            >
              <option value={NOT_TAKEN}>– nicht übernehmen –</option>
              {FIELD_GROUPS.map((group) => (
                <optgroup key={group.title} label={group.title}>
                  {group.fields.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </li>
        ))}
      </ul>
    </>
  )
}

/** The mapping of last time for the same columns, else the suggestions; without header row nothing */
function startMapping(table: ImportPreview, firstRowIsData: boolean): Mapping {
  if (firstRowIsData) return table.columns.map(() => null)
  return rememberedMapping(table.columns.map((c) => c.header)) ?? table.columns.map((c) => c.suggested)
}

function samplesText(samples: string[]): string {
  const values = samples.filter((s) => s !== '').slice(0, 3)
  return values.length > 0 ? `z. B. ${values.join(' · ')}` : 'in den ersten Zeilen leer'
}

const VISIBLE_PROBLEMS = 5

function Result({ title, result }: { title: string; result: ImportResult }) {
  const titleId = useId()
  const visible = result.problems.slice(0, VISIBLE_PROBLEMS)
  const hidden = result.problems.slice(VISIBLE_PROBLEMS)
  return (
    <section className={styles.result} aria-labelledby={titleId}>
      <h3 id={titleId}>{title}</h3>
      <p>
        {rowsText(result.rowsRead)} gelesen: {resultText(result)}
      </p>
      {result.problems.length > 0 && (
        <div className={styles.problems}>
          <p className={styles.problemsTitle}>{result.problems.length === 1 ? '1 Hinweis' : `${result.problems.length} Hinweise`}</p>
          <ul>
            {visible.map((problem, i) => (
              <li key={i}>{problem}</li>
            ))}
          </ul>
          {hidden.length > 0 && (
            <details>
              <summary>alle {result.problems.length} anzeigen</summary>
              <ul>
                {hidden.map((problem, i) => (
                  <li key={i}>{problem}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
