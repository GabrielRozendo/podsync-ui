import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { MobileMenuButton } from './Sidebar';
import type { ContainerStatus, RestartResponse } from '@podsync-ui/shared';
import { toast } from 'sonner';

export default function StatusBar() {
  const queryClient = useQueryClient();

  const { data: status } = useQuery<ContainerStatus>({
    queryKey: ['docker-status'],
    queryFn: () => api.get('/docker/status'),
    refetchInterval: 5000,
  });

  const restartMutation = useMutation<RestartResponse>({
    mutationFn: () => api.post('/apply'),
    onSuccess: () => {
      toast.success('Container restarted successfully');
      queryClient.invalidateQueries({ queryKey: ['docker-status'] });
    },
    onError: (err: Error) => {
      toast.error(`Restart failed: ${err.message}`);
    },
  });

  const stateColor: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    restarting: 'bg-yellow-500',
    paused: 'bg-yellow-500',
    dead: 'bg-red-500',
    unknown: 'bg-gray-500',
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-2 border-b bg-card px-3 sm:gap-4 sm:px-6 md:left-64">
      <MobileMenuButton />
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">Podsync:</span>
        <Badge variant="outline" className="gap-1.5">
          <span className={`h-2 w-2 rounded-full ${stateColor[status?.state || 'unknown']}`} />
          {status?.state || 'unknown'}
        </Badge>
        {status?.uptime !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatUptime(status.uptime)}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {status?.restartNeeded && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Config changed
          </Badge>
        )}
        <Button
          size="sm"
          variant={status?.restartNeeded ? 'default' : 'outline'}
          onClick={() => restartMutation.mutate()}
          disabled={restartMutation.isPending}
        >
          <RefreshCw className={`h-3 w-3 sm:mr-1 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{status?.restartNeeded ? 'Apply & Restart' : 'Restart'}</span>
        </Button>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
