import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Company = components['schemas']['CompanyDto']
export type CompanyRequest = components['schemas']['CompanyRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'company'

/** Name, address and logo URL of the workshop – navigation, task sheet, settings. */
export function useCompany() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/company', { signal })),
    // changes rarely; the live update reloads it when it does
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CompanyRequest) => dataOrThrow(await api.PUT('/api/company', { body: request })),
    onSuccess: (company) => queryClient.setQueryData([TOPIC], company),
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      // The generated type describes the file as "string" – what is sent is the FormData above
      return dataOrThrow(await api.PUT('/api/company/logo', { body: { file: file.name }, bodySerializer: () => form }))
    },
    onSuccess: (company) => queryClient.setQueryData([TOPIC], company),
  })
}

export function useDeleteLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => dataOrThrow(await api.DELETE('/api/company/logo')),
    onSuccess: (company) => queryClient.setQueryData([TOPIC], company),
  })
}
