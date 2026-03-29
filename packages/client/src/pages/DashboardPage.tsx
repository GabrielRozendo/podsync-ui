import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rss, HardDrive, FileAudio, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDockerStatus } from '@/hooks/use-docker';
import { useDashboard, useFeedHealth } from '@/hooks/use-settings';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useDockerStatus();
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: feedHealth, isLoading: healthLoading } = useFeedHealth();

  const stateColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    restarting: 'bg-yellow-500',
    unknown: 'bg-gray-500',
  };

  // Sort feeds by size descending for the storage breakdown
  const sortedBySize = feedHealth ? [...feedHealth].sort((a, b) => b.sizeBytes - a.sizeBytes) : [];
  const totalSize = sortedBySize.reduce((sum, f) => sum + f.sizeBytes, 0);

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

      {/* Feed Health */}
      <Card>
        <CardHeader>
          <CardTitle>Feed Health</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {healthLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !feedHealth?.length ? (
            <div className="p-6 text-center text-muted-foreground">No feeds configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feed</TableHead>
                  <TableHead className="w-24">Format</TableHead>
                  <TableHead className="w-28">Last Updated</TableHead>
                  <TableHead className="w-20 text-right">In RSS</TableHead>
                  <TableHead className="w-20 text-right">On Disk</TableHead>
                  <TableHead className="w-20 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedHealth.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell>
                      <Link to={`/feeds/${feed.id}`} className="hover:underline font-medium">
                        {feed.title}
                      </Link>
                      {feed.title !== feed.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{feed.id}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{feed.format}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {feed.lastBuildDate ? timeAgo(feed.lastBuildDate) : '--'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {feed.episodesInRss ?? '--'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {feed.episodesOnDisk}
                    </TableCell>
                    <TableCell className="text-right">
                      {feed.stale ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Stale
                        </Badge>
                      ) : feed.lastBuildDate ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                          <CheckCircle className="h-3 w-3" /> OK
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-Feed Storage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !sortedBySize.length ? (
            <div className="text-center text-muted-foreground">No feed data.</div>
          ) : (
            <div className="space-y-3">
              {sortedBySize.map((feed) => {
                const pct = totalSize > 0 ? (feed.sizeBytes / totalSize) * 100 : 0;
                return (
                  <div key={feed.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Link to={`/feeds/${feed.id}`} className="hover:underline font-medium truncate max-w-[60%]">
                        {feed.title}
                      </Link>
                      <span className="text-muted-foreground whitespace-nowrap ml-2">
                        {formatBytes(feed.sizeBytes)} ({feed.episodesOnDisk} eps)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(pct, 0.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
