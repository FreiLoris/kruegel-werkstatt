import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ImportField = components['schemas']['DataImportColumnMapping']['field']
export type ImportPreview = components['schemas']['DataImportPreviewDto']
export type ImportColumn = components['schemas']['DataImportColumnDto']
export type ImportResult = components['schemas']['DataImportResultDto']
export type ImportSettings = components['schemas']['DataImportRequest']

/** How to read the file – the same for the preview and the import */
export interface ReadOptions {
  /** `null`: as found out from the file */
  charset: string | null
  firstRowIsData: boolean
}

/** The columns of the file with their first values – nothing is stored (neutral 5). */
export function useImportPreview() {
  return useMutation({
    mutationFn: async ({ file, options }: { file: File; options: ReadOptions }) => {
      const form = new FormData()
      form.append('file', file)
      return dataOrThrow(
        await api.POST('/api/data-import/preview', {
          params: { query: { charset: options.charset ?? undefined, firstRowIsData: options.firstRowIsData } },
          // The generated type describes the file as "string" – what is sent is the FormData above
          body: { file: file.name },
          bodySerializer: () => form,
        }),
      )
    },
  })
}

/**
 * The dry run or the import. The settings go as a JSON part next to the file – that is what the
 * backend reads with `@RequestPart`. After a real import the customers and vehicles are reloaded.
 */
export function useImportData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, settings }: { file: File; settings: ImportSettings }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('settings', new Blob([JSON.stringify(settings)], { type: 'application/json' }))
      return dataOrThrow(
        await api.POST('/api/data-import', {
          body: { file: file.name, settings },
          bodySerializer: () => form,
        }),
      )
    },
    onSuccess: (result) =>
      result.dryRun
        ? undefined
        : Promise.all([
            queryClient.invalidateQueries({ queryKey: ['customers'] }),
            queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
          ]),
  })
}
