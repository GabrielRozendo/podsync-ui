import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EpisodeListResponse } from '@podsync-ui/shared';

export function useEpisodes(
  feedId: string,
  page: number = 1,
  pageSize: number = 50,
  sort: string = 'date',
  order: string = 'desc',
) {
  return useQuery<EpisodeListResponse>({
    queryKey: ['episodes', feedId, page, pageSize, sort, order],
    queryFn: () =>
      api.get(`/feeds/${feedId}/episodes?page=${page}&pageSize=${pageSize}&sort=${sort}&order=${order}`),
    enabled: !!feedId,
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
