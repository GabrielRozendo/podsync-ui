import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Rss, HardDrive, FileAudio } from 'lucide-react';
import { useDockerStatus } from '@/hooks/use-docker';
import { useDashboard } from '@/hooks/use-settings';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useDockerStatus();
  const { data: dashboard, isLoading: dashLoading } = useDashboard();

  const stateColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    restarting: 'bg-yellow-500',
    unknown: 'bg-gray-500',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Container Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Container Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <Badge variant="outline" className="gap-1.5 text-base">
                  <span className={`h-2.5 w-2.5 rounded-full ${stateColors[status?.state || 'unknown']}`} />
                  {status?.state || 'unknown'}
                </Badge>
                {status?.uptime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Uptime: {formatUptime(status.uptime)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feed Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feeds</CardTitle>
            <Rss className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboard?.feedCount ?? 0}</div>
            )}
          </CardContent>
        </Card>

        {/* Episode Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Episodes</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{dashboard?.totalEpisodes ?? 0}</div>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {formatBytes(dashboard?.totalSizeBytes ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
