import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EpisodeListResponse } from '@podsync-ui/shared';

export function useEpisodes(
  feedId: string,
  page: number = 1,
  pageSize: number = 50,
  sort: string = 'date',
  order: string = 'desc',
  search: string = '',
) {
  return useQuery<EpisodeListResponse>({
    queryKey: ['episodes', feedId, page, pageSize, sort, order, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort, order });
      if (search) params.set('search', search);
      return api.get(`/feeds/${feedId}/episodes?${params}`);
    },
    enabled: !!feedId,
  });
}

export function useFeedRss(feedId: string, enabled: boolean = false) {
  return useQuery<string>({
    queryKey: ['feed-rss', feedId],
    queryFn: () => api.getRaw(`/feeds/${feedId}/rss`),
    enabled: !!feedId && enabled,
    staleTime: 60_000,
  });
}

export function useDeleteEpisode(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) =>
      api.delete(`/feeds/${feedId}/episodes/${encodeURIComponent(filename)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBulkDeleteEpisodes(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors: string[]; total: number }, Error, string[]>({
    mutationFn: (filenames) =>
      api.post(`/feeds/${feedId}/episodes/bulk-delete`, { filenames }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCleanupAge(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors?: string[]; total: number }, Error, number>({
    mutationFn: (olderThanDays) =>
      api.post(`/feeds/${feedId}/episodes/cleanup/age`, { olderThanDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCleanupKeepLast(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors?: string[]; kept: number; total: number }, Error, number>({
    mutationFn: (keepLast) =>
      api.post(`/feeds/${feedId}/episodes/cleanup/keep-last`, { keepLast }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRefetchMetadata(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (videoId) => api.post(`/metadata/${videoId}/refetch`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
    },
  });
}

export function useUnavailableEpisodes(feedId: string, enabled: boolean = false) {
  return useQuery<{
    unavailable: any[];
    unchecked: number;
    totalOnDisk: number;
    totalInRss: number;
  }>({
    queryKey: ['episodes', feedId, 'unavailable'],
    queryFn: () => api.get(`/feeds/${feedId}/episodes/unavailable`),
    enabled: !!feedId && enabled,
  });
}

export function useCleanupUnavailable(feedId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors?: string[]; total: number }, Error, void>({
    mutationFn: () =>
      api.post(`/feeds/${feedId}/episodes/cleanup/unavailable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes', feedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOrphanedEpisodes(feedId: string, enabled: boolean = false) {
  return useQuery<{
    orphaned: any[];
    totalOnDisk: number;
    totalInRss: number;
    message?: string;
  }>({
    queryKey: ['episodes', feedId, 'orphaned'],
    queryFn: () => api.get(`/feeds/${feedId}/episodes/orphaned`),
    enabled: !!feedId && enabled,
  });
}

export function useGlobalOrphanedEpisodes(enabled: boolean = false) {
  return useQuery<{
    orphaned: any[];
    totalOnDisk: number;
    totalInRss: number;
    feedErrors: { feedId: string; message: string }[];
  }>({
    queryKey: ['dashboard', 'cleanup', 'orphaned'],
    queryFn: () => api.get('/dashboard/cleanup/orphaned'),
    enabled,
  });
}

export function useGlobalUnavailableEpisodes(enabled: boolean = false) {
  return useQuery<{
    unavailable: any[];
    unchecked: number;
    totalOnDisk: number;
    totalInRss: number;
  }>({
    queryKey: ['dashboard', 'cleanup', 'unavailable'],
    queryFn: () => api.get('/dashboard/cleanup/unavailable'),
    enabled,
  });
}

export function useGlobalCleanupOrphans() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors?: string[]; total: number }, Error, void>({
    mutationFn: () => api.post('/dashboard/cleanup/orphaned'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGlobalCleanupUnavailable() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number; errors?: string[]; total: number }, Error, void>({
    mutationFn: () => api.post('/dashboard/cleanup/unavailable'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
