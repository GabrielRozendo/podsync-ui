import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSettings<T = Record<string, any>>(section: string) {
  return useQuery<T>({
    queryKey: ['settings', section],
    queryFn: () => api.get(`/settings/${section}`),
  });
}

export function useUpdateSettings(section: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.put(`/settings/${section}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', section] });
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.get('/tokens'),
  });
}

export function useUnmaskedTokens() {
  return useQuery({
    queryKey: ['tokens', 'unmasked'],
    queryFn: () => api.get('/tokens?unmask=true'),
    enabled: false,
  });
}

export function useUpdateTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => api.put('/tokens', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}

export function useConfig() {
  return useQuery<{ server?: { hostname?: string; port?: number } }>({
    queryKey: ['config'],
    queryFn: () => api.get('/config'),
  });
}

export function useDashboard() {
  return useQuery<{ feedCount: number; totalEpisodes: number; totalSizeBytes: number }>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  });
}

export function useAuth() {
  return useQuery<{ enabled: boolean; username?: string }>({
    queryKey: ['auth'],
    queryFn: () => api.get('/auth'),
  });
}

export function useUpdateAuth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { enabled: boolean; username?: string; password?: string }) =>
      api.put('/auth', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}
