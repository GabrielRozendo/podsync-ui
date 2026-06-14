import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rss, HardDrive, FileAudio, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react';
import { useDockerStatus } from '@/hooks/use-docker';
import { useDashboard, useFeedHealth } from '@/hooks/use-settings';
import type { FeedHealthInfo } from '@/hooks/use-settings';

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

type SortField = 'title' | 'format' | 'lastBuildDate' | 'episodesInRss' | 'episodesOnDisk' | 'stale';

function sortFeeds(feeds: FeedHealthInfo[], field: SortField, order: 'asc' | 'desc'): FeedHealthInfo[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...feeds].sort((a, b) => {
    switch (field) {
      case 'title':
        return (a.title || a.id).localeCompare(b.title || b.id) * dir;
      case 'format':
        return (a.format || '').localeCompare(b.format || '') * dir;
      case 'lastBuildDate': {
        const aT = a.lastBuildDate ? new Date(a.lastBuildDate).getTime() : 0;
        const bT = b.lastBuildDate ? new Date(b.lastBuildDate).getTime() : 0;
        return (aT - bT) * dir;
      }
      case 'episodesInRss':
        return ((a.episodesInRss ?? -1) - (b.episodesInRss ?? -1)) * dir;
      case 'episodesOnDisk':
        return (a.episodesOnDisk - b.episodesOnDisk) * dir;
      case 'stale':
        return ((a.stale ? 1 : 0) - (b.stale ? 1 : 0)) * dir;
      default:
        return 0;
    }
  });
}

function SortableHead({
  label, field, currentSort, currentOrder, onSort, className,
}: {
  label: string; field: SortField; currentSort: SortField; currentOrder: 'asc' | 'desc';
  onSort: (f: SortField) => void; className?: string;
}) {
  const active = currentSort === field;
  return (
    <TableHead className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'text-foreground' : 'text-muted-foreground/40'}`} />
        {active && <span className="text-[10px]">{currentOrder === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  );
}

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useDockerStatus();
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: feedHealth, isLoading: healthLoading } = useFeedHealth();

  const [healthSort, setHealthSort] = useState<SortField>('title');
  const [healthOrder, setHealthOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (healthSort === field) {
      setHealthOrder((o) => o === 'asc' ? 'desc' : 'asc');
    } else {
      setHealthSort(field);
      setHealthOrder('asc');
    }
  };

  const stateColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    restarting: 'bg-yellow-500',
    unknown: 'bg-gray-500',
  };

  const sortedHealth = feedHealth ? sortFeeds(feedHealth, healthSort, healthOrder) : [];
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
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Feed" field="title" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} />
                  <SortableHead label="Format" field="format" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} className="w-24" />
                  <SortableHead label="Last Updated" field="lastBuildDate" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} className="w-28" />
                  <SortableHead label="In RSS" field="episodesInRss" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} className="w-20 text-right" />
                  <SortableHead label="On Disk" field="episodesOnDisk" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} className="w-20 text-right" />
                  <SortableHead label="Status" field="stale" currentSort={healthSort} currentOrder={healthOrder} onSort={handleSort} className="w-20 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHealth.map((feed) => (
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
            </div>
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
                      <Link to={`/feeds/${feed.id}`} className="hover:underline font-medium truncate max-w-[50%] sm:max-w-[60%]">
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
