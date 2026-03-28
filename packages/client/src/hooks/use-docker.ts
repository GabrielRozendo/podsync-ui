import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContainerStatus, RestartResponse } from '@podsync-ui/shared';

export function useDockerStatus() {
  return useQuery<ContainerStatus>({
    queryKey: ['docker-status'],
    queryFn: () => api.get('/docker/status'),
    refetchInterval: 5000,
  });
}

export function useRestart() {
  const queryClient = useQueryClient();
  return useMutation<RestartResponse>({
    mutationFn: () => api.post('/apply'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}
