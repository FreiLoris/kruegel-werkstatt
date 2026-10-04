import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { ApiError } from '../../api/errors'
import { useToast } from '../../components/ui/toastContext'
import { formatTimestamp } from '../../lib/format'
import styles from './ImportCard.module.css'
import { ImportResult } from './ImportResult'
import { IMPORT_FILES, useImportFile, type ImportKind, type ImportRun } from './swissGarageApi'

interface ImportCardProps {
  kind: ImportKind
  /** Newest log entry of this kind – for "zuletzt importiert am …" */
  lastRun: ImportRun | undefined
  canEdit: boolean
}

/**
 * Upload of one SwissGarage export: drop the file or choose it – it is imported right away.
 * Afterwards the result of exactly this upload is shown, otherwise the last import.
 */
export function ImportCard({ kind, lastRun, canEdit }: ImportCardProps) {
  const texts = IMPORT_FILES[kind]
  const importFile = useImportFile()
  const toast = useToast()
  const [dragging, setDragging] = useState(false)

  function start(file: File | undefined) {
    if (!file || importFile.isPending) return
    importFile.mutate(
      { kind, file },
      { onSuccess: (run) => toast.success(`${texts.title} importiert: ${run.fileName}`) },
    )
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (canEdit) start(event.dataTransfer.files[0])
  }

  const shownRun = importFile.data ?? lastRun
  const error = importFile.error instanceof ApiError ? importFile.error : null

  return (
    <section className={styles.card} aria-labelledby={`import-${kind}`}>
      <h3 id={`import-${kind}`}>{texts.title}</h3>
      <p className="muted">
        {texts.fileName} – Export in {texts.howToExport}
      </p>

      {canEdit ? (
        <label
          className={[styles.dropZone, dragging && styles.dragging, importFile.isPending && styles.busy]
            .filter(Boolean)
            .join(' ')}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          {importFile.isPending ? (
            <>
              <LoaderCircle className={styles.spinner} aria-hidden />
              <span>Wird importiert …</span>
            </>
          ) : (
            <>
              <FileSpreadsheet aria-hidden />
              <span>
                Datei hierher ziehen oder <u>auswählen</u>
              </span>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={styles.input}
            disabled={importFile.isPending}
            onChange={(event) => {
              start(event.target.files?.[0])
              // the same file can be chosen again (e.g. after fixing it)
              event.target.value = ''
            }}
          />
        </label>
      ) : (
        <p className={styles.hint}>Zum Importieren zuerst oben rechts eine Person wählen.</p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error.messageForField('file') ?? error.message}
        </p>
      )}

      {shownRun ? (
        <div className={styles.last}>
          <p className={styles.lastTitle}>
            {importFile.data ? 'Ergebnis' : 'Zuletzt importiert'} am {formatTimestamp(shownRun.importedAt)} ·{' '}
            {shownRun.fileName}
          </p>
          <ImportResult run={shownRun} />
        </div>
      ) : (
        <p className="muted">Noch nie importiert.</p>
      )}
    </section>
  )
}
