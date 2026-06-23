import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rss, HardDrive, FileAudio, AlertTriangle, CheckCircle, ArrowUpDown, Wrench } from 'lucide-react';
import { useDockerStatus } from '@/hooks/use-docker';
import { useDashboard, useFeedHealth } from '@/hooks/use-settings';
import type { FeedHealthInfo } from '@/hooks/use-settings';
import {
  useGlobalOrphanedEpisodes,
  useGlobalUnavailableEpisodes,
  useGlobalCleanupOrphans,
  useGlobalCleanupUnavailable,
} from '@/hooks/use-episodes';
import { toast } from 'sonner';

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

type SortField = 'title' | 'format' | 'lastBuildDate' | 'episodesInRss' | 'episodesOnDisk' | 'sizeBytes' | 'stale';

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
      case 'sizeBytes':
        return (a.sizeBytes - b.sizeBytes) * dir;
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

function DashboardCleanupDialog({ totalEpisodes }: { totalEpisodes: number }) {
  const [open, setOpen] = useState(false);
  const [showOrphans, setShowOrphans] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const { data: orphanData, isLoading: orphansLoading } = useGlobalOrphanedEpisodes(showOrphans);
  const { data: unavailableData, isLoading: unavailableLoading } = useGlobalUnavailableEpisodes(showUnavailable);
  const cleanupOrphans = useGlobalCleanupOrphans();
  const cleanupUnavailable = useGlobalCleanupUnavailable();

  const handleDeleteOrphans = async () => {
    if (!orphanData?.orphaned.length) return;
    const result = await cleanupOrphans.mutateAsync();
    if (result.errors?.length) {
      toast.warning(`Deleted ${result.deleted}, ${result.errors.length} failed`, {
        description: result.errors.slice(0, 3).join('\n'),
      });
    } else {
      toast.success(`Deleted ${result.deleted} orphaned episodes across all feeds`);
    }
    setShowOrphans(false);
  };

  const handleDeleteUnavailable = async () => {
    const result = await cleanupUnavailable.mutateAsync();
    if (result.errors?.length) {
      toast.warning(`Deleted ${result.deleted}, ${result.errors.length} failed`, {
        description: result.errors.slice(0, 3).join('\n'),
      });
    } else {
      toast.success(`Deleted ${result.deleted} unavailable episodes across all feeds`);
    }
    setShowUnavailable(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowOrphans(false); setShowUnavailable(false); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wrench className="mr-2 h-4 w-4" />
          Cleanup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cleanup All Feeds</DialogTitle>
          <DialogDescription>{totalEpisodes} episodes on disk across all feeds</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Missing from RSS</Label>
            <p className="text-xs text-muted-foreground">Find downloaded files no longer in any feed. Safe to delete — Podsync won&apos;t re-download them.</p>
            {!showOrphans ? (
              <Button size="sm" variant="outline" onClick={() => setShowOrphans(true)}>
                Scan all feeds
              </Button>
            ) : orphansLoading ? (
              <p className="text-sm text-muted-foreground">Scanning all feeds...</p>
            ) : !orphanData?.orphaned.length && !orphanData?.feedErrors.length ? (
              <p className="text-sm text-green-600">No orphaned files found.</p>
            ) : (
              <div className="space-y-2">
                {orphanData?.feedErrors.map((err) => (
                  <p key={err.feedId} className="text-sm text-muted-foreground">
                    {err.feedId}: {err.message}
                  </p>
                ))}
                {orphanData?.orphaned.length ? (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">
                        {orphanData.orphaned.length} orphaned files ({formatBytes(orphanData.orphaned.reduce((s, e) => s + e.fileSizeBytes, 0))})
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                      {orphanData.orphaned.map((e) => (
                        <div key={`${e.feedId}/${e.filename}`}>{e.feedId}/{e.filename} ({formatBytes(e.fileSizeBytes)})</div>
                      ))}
                    </div>
                    <Button size="sm" variant="destructive" onClick={handleDeleteOrphans} disabled={cleanupOrphans.isPending}>
                      Delete all orphans
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-green-600">No orphaned files found in scannable feeds.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Unavailable source videos</Label>
            <p className="text-xs text-muted-foreground">Find files not in any feed where the source video is confirmed gone (yt-dlp lookup failed). Safe to delete.</p>
            {!showUnavailable ? (
              <Button size="sm" variant="outline" onClick={() => setShowUnavailable(true)}>
                Scan all feeds
              </Button>
            ) : unavailableLoading ? (
              <p className="text-sm text-muted-foreground">Scanning all feeds...</p>
            ) : unavailableData?.unavailable.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-green-600">No unavailable episodes found.</p>
                {(unavailableData?.unchecked ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unavailableData!.unchecked} orphaned episode{unavailableData!.unchecked !== 1 ? 's' : ''} not yet checked — metadata will be fetched in the background.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    {unavailableData?.unavailable.length} unavailable ({formatBytes(unavailableData?.unavailable.reduce((s, e) => s + e.fileSizeBytes, 0) || 0)})
                  </span>
                </div>
                {(unavailableData?.unchecked ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unavailableData!.unchecked} more orphan{unavailableData!.unchecked !== 1 ? 's' : ''} still pending yt-dlp check.
                  </p>
                )}
                <div className="max-h-32 overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                  {unavailableData?.unavailable.map((e) => (
                    <div key={`${e.feedId}/${e.filename}`}>{e.feedId}/{e.filename} ({formatBytes(e.fileSizeBytes)})</div>
                  ))}
                </div>
                <Button size="sm" variant="destructive" onClick={handleDeleteUnavailable} disabled={cleanupUnavailable.isPending}>
                  Delete all unavailable
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useDockerStatus();
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: feedHealth, isLoading: healthLoading } = useFeedHealth();

  const [feedSort, setFeedSort] = useState<SortField>('title');
  const [feedOrder, setFeedOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (feedSort === field) {
      setFeedOrder((o) => o === 'asc' ? 'desc' : 'asc');
    } else {
      setFeedSort(field);
      setFeedOrder('asc');
    }
  };

  const stateColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    restarting: 'bg-yellow-500',
    unknown: 'bg-gray-500',
  };

  const sortedFeeds = feedHealth ? sortFeeds(feedHealth, feedSort, feedOrder) : [];
  const maxFeedSize = feedHealth?.reduce((max, f) => Math.max(max, f.sizeBytes), 0) ?? 0;

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

      {/* Feeds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Feeds</CardTitle>
          {!healthLoading && (feedHealth?.length ?? 0) > 0 && (
            <DashboardCleanupDialog totalEpisodes={dashboard?.totalEpisodes ?? 0} />
          )}
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
                  <SortableHead label="Feed" field="title" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} />
                  <SortableHead label="Format" field="format" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-24" />
                  <SortableHead label="Last Updated" field="lastBuildDate" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-28" />
                  <SortableHead label="In RSS" field="episodesInRss" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-20 text-right" />
                  <SortableHead label="On Disk" field="episodesOnDisk" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-20 text-right" />
                  <SortableHead label="Storage" field="sizeBytes" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-36" />
                  <SortableHead label="Status" field="stale" currentSort={feedSort} currentOrder={feedOrder} onSort={handleSort} className="w-20 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFeeds.map((feed) => {
                  const barWidth = maxFeedSize > 0 ? (feed.sizeBytes / maxFeedSize) * 100 : 0;
                  return (
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
                    <TableCell>
                      <div className="space-y-1 min-w-[7rem]">
                        <div className="text-sm text-muted-foreground">{formatBytes(feed.sizeBytes)}</div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          {barWidth > 0 && (
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          )}
                        </div>
                      </div>
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
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
