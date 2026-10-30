import type { AppModule } from '../features/modules/moduleApi'

/**
 * Stand-in for `features/modules/moduleApi` in page tests (neutral 3): all on, as the app was before –
 * a test switches one off with `modulesOff.add(…)`.
 *
 *   vi.mock('../../modules/moduleApi', () => import('../../../test/allModulesOn'))
 */
export const modulesOff = new Set<AppModule>()

export function useModuleOn(module: AppModule): boolean {
  return !modulesOff.has(module)
}

export function useModulesOn(): (module: AppModule | undefined) => boolean {
  return (module) => module === undefined || !modulesOff.has(module)
}
