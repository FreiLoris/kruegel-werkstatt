import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ModuleSettings = components['schemas']['ModuleSettingsDto']
export type ModuleSettingsRequest = components['schemas']['ModuleSettingsRequest']
export type AppModule = components['schemas']['ModuleDto']['module']

/** Topic for query keys and live updates – same text as in the backend (ModuleSettingsService.TOPIC). */
const TOPIC = 'modules'

/** The parts of the app and which ones the workshop uses (neutral 3) */
export function useModuleSettings() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/modules', { signal })),
    // the menu of every page: kept, a change comes by the live topic
    staleTime: Infinity,
  })
}

/**
 * Whether the workshop uses this part of the app. On while loading or without the server – the app
 * was all on before neutral 3, nothing must blink away.
 */
export function useModuleOn(module: AppModule): boolean {
  const { data } = useModuleSettings()
  return isOn(data, module)
}

/** The same for several – for lists of things that belong to a module */
export function useModulesOn(): (module: AppModule | undefined) => boolean {
  const { data } = useModuleSettings()
  return (module) => module === undefined || isOn(data, module)
}

function isOn(settings: ModuleSettings | undefined, module: AppModule): boolean {
  return settings?.modules.find((m) => m.module === module)?.on ?? true
}

export function useSaveModuleSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ModuleSettingsRequest) => dataOrThrow(await api.PUT('/api/modules', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
