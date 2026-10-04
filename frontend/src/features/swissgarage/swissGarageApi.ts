import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ImportRun = components['schemas']['ImportRunDto']
export type ImportKind = ImportRun['kind']
export type SwissGarageStatus = components['schemas']['SwissGarageStatusDto']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'swissgarage-imports'

/** What the user needs to know per export – UI texts, hence German. */
export const IMPORT_FILES: Record<ImportKind, { title: string; fileName: string; howToExport: string }> = {
  CUSTOMERS: {
    title: 'Adressliste',
    fileName: 'Adrliste.xlsx',
    howToExport: 'SwissGarage → Adressen → Export → Excel',
  },
  VEHICLES: {
    title: 'Fahrzeugliste',
    fileName: 'Fahrzeug.xlsx',
    howToExport: 'SwissGarage → Fahrzeuge → Export → Excel',
  },
}

/** The last 20 imports, newest first. */
export function useImportRuns() {
  return useQuery({
    queryKey: [TOPIC, 'runs'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/swissgarage-imports', { signal })),
  })
}

/** How many SwissGarage customers/vehicles the app currently has. */
export function useSwissGarageStatus() {
  return useQuery({
    queryKey: [TOPIC, 'status'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/swissgarage-imports/status', { signal })),
  })
}

/**
 * Uploads one export. The result (counts, problems) is the new log entry.
 *
 * Afterwards customers and vehicles are reloaded too – the customer search shows the new data
 * right away (other devices get it through the live update).
 */
export function useImportFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: ImportKind; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      const options = {
        // The generated type describes the file as "string" (format binary). What is sent is the
        // FormData above – the body is only there to satisfy the type.
        body: { file: file.name },
        bodySerializer: () => form,
      }
      return kind === 'CUSTOMERS'
        ? dataOrThrow(await api.POST('/api/swissgarage-imports/customers', options))
        : dataOrThrow(await api.POST('/api/swissgarage-imports/vehicles', options))
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [TOPIC] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]),
  })
}
