import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedConfig } from '@podsync-ui/shared';

export type FeedWithId = FeedConfig & { id: string; rssTitle?: string };

export function useFeeds() {
  return useQuery<FeedWithId[]>({
    queryKey: ['feeds'],
    queryFn: () => api.get('/feeds'),
  });
}

export function useFeed(id: string) {
  return useQuery<FeedWithId>({
    queryKey: ['feeds', id],
    queryFn: () => api.get(`/feeds/${id}`),
    enabled: !!id,
  });
}

export function useCreateFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string } & Partial<FeedConfig>) => api.post('/feeds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}

export function useUpdateFeed(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FeedConfig>) => api.put(`/feeds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['feeds', id] });
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}

export function useDeleteFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/feeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
  });
}
