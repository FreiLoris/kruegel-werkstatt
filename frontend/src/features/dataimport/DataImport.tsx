import { FileSpreadsheet, FlaskConical, LoaderCircle, Upload } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Checkbox, Select } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatCount } from '../../lib/format'
import styles from './DataImport.module.css'
import {
  useImportData,
  useImportPreview,
  type ImportField,
  type ImportPreview,
  type ImportResult,
  type ReadOptions,
} from './dataImportApi'
import { FIELD_GROUPS, mappingProblems, rememberedMapping, rememberMapping, resultText, type Mapping } from './importFields'

const AUTO = ''
const CHARSET_LABELS: Record<string, string> = { 'UTF-8': 'UTF-8', 'windows-1252': 'Windows (ANSI)' }

/**
 * Customers and vehicles from the file of another program (neutral 5): choose the file, say which
 * column is what, look at the dry run, take over. In "Einstellungen" and in the setup assistant.
 */
export function DataImport() {
  const canEdit = useCanEdit()
  const toast = useToast()
  const preview = useImportPreview()
  const importData = useImportData()
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<ReadOptions>({ charset: null, firstRowIsData: false })
  const [mapping, setMapping] = useState<Mapping>([])
  const [dryRun, setDryRun] = useState<ImportResult | null>(null)
  const [done, setDone] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)

  const table = preview.data
  const error = [preview.error, importData.error].find((e) => e instanceof ApiError)

  /** Reads the file (again); a new file starts with the suggestions or the mapping of last time */
  function read(chosen: File, readOptions: ReadOptions, keepMapping: boolean) {
    setDryRun(null)
    setDone(null)
    importData.reset()
    preview.mutate(
      { file: chosen, options: readOptions },
      {
        onSuccess: (result) => {
          if (!keepMapping || mapping.length !== result.columns.length) setMapping(startMapping(result, readOptions.firstRowIsData))
        },
      },
    )
  }

  function choose(chosen: File | undefined) {
    if (!chosen) return
    const fresh = { charset: null, firstRowIsData: false }
    setFile(chosen)
    setOptions(fresh)
    read(chosen, fresh, false)
  }

  function changeOptions(changed: ReadOptions) {
    setOptions(changed)
    // other character set: same columns, the mapping stays; header row or not: other columns
    if (file) read(file, changed, changed.firstRowIsData === options.firstRowIsData)
  }

  function assign(column: number, field: ImportField | null) {
    setMapping((current) => current.map((f, i) => (i === column ? field : f)))
    setDryRun(null)
  }

  function run(isDryRun: boolean) {
    if (!file || !table) return
    const settings = {
      columns: mapping.flatMap((field, index) => (field ? [{ index, field }] : [])),
      charset: options.charset,
      firstRowIsData: options.firstRowIsData,
      dryRun: isDryRun,
    }
    importData.mutate(
      { file, settings },
      {
        onSuccess: (result) => {
          if (result.dryRun) {
            setDryRun(result)
            return
          }
          if (!options.firstRowIsData) rememberMapping(table.columns.map((c) => c.header), mapping)
          setDone(result)
          toast.success(`Übernommen: ${resultText(result)}`)
        },
      },
    )
  }

  function startOver() {
    setFile(null)
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
      {!table && (
        <label
          className={[styles.dropZone, dragging && styles.dragging].filter(Boolean).join(' ')}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          {preview.isPending ? (
            <>
              <LoaderCircle className={styles.spinner} aria-hidden />
              <span>Wird gelesen …</span>
            </>
          ) : (
            <>
              <FileSpreadsheet aria-hidden />
              <span>
                CSV- oder Excel-Datei hierher ziehen oder <u>auswählen</u>
              </span>
            </>
          )}
          <input
            type="file"
            accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.input}
            disabled={preview.isPending}
            onChange={(event) => {
              choose(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error.messageForField('file') ?? error.messageForField('columns') ?? error.message}
        </p>
      )}

      {table && file && (
        <>
          <div className={styles.fileBar}>
            <p>
              <strong>{file.name}</strong> · {formatCount(table.rowCount)} {table.rowCount === 1 ? 'Zeile' : 'Zeilen'}
            </p>
            <Button small onClick={startOver}>
              Andere Datei
            </Button>
          </div>

          <div className={styles.options}>
            <Checkbox
              label="Erste Zeile enthält schon Daten (keine Überschriften)"
              checked={options.firstRowIsData}
              disabled={preview.isPending}
              onChange={(event) => changeOptions({ ...options, firstRowIsData: event.target.checked })}
            />
            {table.charset && (
              <Select
                label="Zeichensatz"
                hint="Sehen Umlaute falsch aus (Ã¼ statt ü)? Den anderen wählen."
                value={options.charset ?? AUTO}
                disabled={preview.isPending}
                onChange={(event) => changeOptions({ ...options, charset: event.target.value || null })}
              >
                <option value={AUTO}>Automatisch ({CHARSET_LABELS[table.charset] ?? table.charset})</option>
                {Object.entries(CHARSET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <h3>Welche Spalte ist was?</h3>
          <p className="muted">Vorgeschlagen nach den Überschriften – bitte prüfen. Spalten ohne Zuordnung werden nicht übernommen.</p>
          <ul className={styles.columns} aria-label="Spalten der Datei">
            {table.columns.map((column) => (
              <li key={column.index}>
                <Select
                  label={column.header}
                  hint={samplesText(column.samples)}
                  value={mapping[column.index] ?? ''}
                  onChange={(event) => assign(column.index, (event.target.value || null) as ImportField | null)}
                >
                  <option value="">– nicht übernehmen –</option>
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

          {problems.length > 0 && (
            <ul className={styles.mappingProblems}>
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          {dryRun ? (
            <>
              <Result title="Probelauf – noch nichts gespeichert" result={dryRun} />
              <div className={styles.actions}>
                <Button variant="primary" icon={Upload} loading={importData.isPending} onClick={() => run(false)}>
                  Jetzt übernehmen
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <Button
                variant="primary"
                icon={FlaskConical}
                loading={importData.isPending}
                disabled={problems.length > 0 || preview.isPending}
                onClick={() => run(true)}
              >
                Probelauf
              </Button>
            </div>
          )}
        </>
      )}
    </div>
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
  const visible = result.problems.slice(0, VISIBLE_PROBLEMS)
  const hidden = result.problems.slice(VISIBLE_PROBLEMS)
  return (
    <section className={styles.result} aria-label={title}>
      <h3>{title}</h3>
      <p>
        {formatCount(result.rowsRead)} Zeilen gelesen: {resultText(result)}
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
