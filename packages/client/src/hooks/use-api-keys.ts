import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiKey, ApiKeyCreateRequest, ApiKeyCreateResponse } from '@podsync-ui/shared';

export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys'),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation<ApiKeyCreateResponse, Error, ApiKeyCreateRequest>({
    mutationFn: (data) => api.post('/api-keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation<ApiKey, Error, string>({
    mutationFn: (id) => api.post(`/api-keys/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
