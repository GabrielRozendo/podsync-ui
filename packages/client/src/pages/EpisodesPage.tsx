import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Trash2, ExternalLink,
  Play, Pause, Settings, ArrowUpDown, AlertTriangle, Wrench, CheckSquare, RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  useEpisodes, useDeleteEpisode, useBulkDeleteEpisodes,
  useCleanupAge, useCleanupKeepLast, useOrphanedEpisodes,
  useUnavailableEpisodes, useCleanupUnavailable, useRefetchMetadata,
} from '@/hooks/use-episodes';
import { api } from '@/lib/api';
import { useConfig } from '@/hooks/use-settings';
import { usePlayerContext } from '@/components/player/PlayerContext';
import { toast } from 'sonner';
import type { Episode } from '@podsync-ui/shared';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// --- Single Delete Dialog ---
function EpisodeDeleteDialog({ episode, feedId }: { episode: Episode; feedId: string }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteEpisode(feedId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(episode.filename);
      toast.success(`Deleted ${episode.title || episode.filename}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Episode</DialogTitle>
          <DialogDescription>
            Delete "{episode.title || episode.filename}"? This removes the downloaded file permanently.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Refetch Metadata Button ---
function RefetchMetadataButton({ episode, feedId }: { episode: Episode; feedId: string }) {
  const refetch = useRefetchMetadata(feedId);
  const videoId = episode.filename.replace(/\.[^.]+$/, '');

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      title="Re-fetch metadata from YouTube"
      disabled={refetch.isPending}
      onClick={() => {
        refetch.mutate(videoId, {
          onSuccess: (data) => {
            if (data.title) {
              toast.success(`Updated: ${data.title}`);
            } else {
              toast.error('yt-dlp could not fetch metadata');
            }
          },
          onError: (err) => toast.error(err.message),
        });
      }}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refetch.isPending ? 'animate-spin' : ''}`} />
    </Button>
  );
}

// --- Cleanup Tools Dialog ---
function CleanupDialog({ feedId, total }: { feedId: string; total: number }) {
  const [open, setOpen] = useState(false);
  const [ageDays, setAgeDays] = useState(90);
  const [keepN, setKeepN] = useState(50);
  const [showOrphans, setShowOrphans] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const cleanupAge = useCleanupAge(feedId);
  const cleanupKeep = useCleanupKeepLast(feedId);
  const { data: orphanData, isLoading: orphansLoading } = useOrphanedEpisodes(feedId, showOrphans);
  const { data: unavailableData, isLoading: unavailableLoading } = useUnavailableEpisodes(feedId, showUnavailable);
  const cleanupUnavailable = useCleanupUnavailable(feedId);
  const bulkDelete = useBulkDeleteEpisodes(feedId);

  const handleCleanupAge = async () => {
    const result = await cleanupAge.mutateAsync(ageDays);
    if (result.errors?.length) {
      toast.warning(`Deleted ${result.deleted}, ${result.errors.length} failed`, {
        description: result.errors.slice(0, 3).join('\n'),
      });
    } else {
      toast.success(`Deleted ${result.deleted} episodes older than ${ageDays} days`);
    }
  };

  const handleKeepLast = async () => {
    const result = await cleanupKeep.mutateAsync(keepN);
    if (result.errors?.length) {
      toast.warning(`Deleted ${result.deleted}, ${result.errors.length} failed`, {
        description: result.errors.slice(0, 3).join('\n'),
      });
    } else {
      toast.success(`Deleted ${result.deleted} episodes, kept ${result.kept}`);
    }
  };

  const handleDeleteUnavailable = async () => {
    const result = await cleanupUnavailable.mutateAsync();
    if (result.errors?.length) {
      toast.warning(`Deleted ${result.deleted}, ${result.errors.length} failed`, {
        description: result.errors.slice(0, 3).join('\n'),
      });
    } else {
      toast.success(`Deleted ${result.deleted} unavailable episodes`);
    }
    setShowUnavailable(false);
  };

  const handleDeleteOrphans = async () => {
    if (!orphanData?.orphaned.length) return;
    const filenames = orphanData.orphaned.map((e: any) => e.filename);
    const result = await bulkDelete.mutateAsync(filenames);
    toast.success(`Deleted ${result.deleted} orphaned episodes`);
    setShowOrphans(false);
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
          <DialogTitle>Episode Cleanup</DialogTitle>
          <DialogDescription>{total} episodes on disk</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {/* Age-based */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Delete older than</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={ageDays} onChange={(e) => setAgeDays(parseInt(e.target.value) || 0)} className="w-20" />
              <span className="text-sm text-muted-foreground">days</span>
              <Button size="sm" variant="destructive" onClick={handleCleanupAge} disabled={cleanupAge.isPending || ageDays < 1}>
                Delete
              </Button>
            </div>
          </div>

          {/* Keep last N */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Keep only last</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={keepN} onChange={(e) => setKeepN(parseInt(e.target.value) || 0)} className="w-20" />
              <span className="text-sm text-muted-foreground">episodes</span>
              <Button size="sm" variant="destructive" onClick={handleKeepLast} disabled={cleanupKeep.isPending || keepN < 1}>
                Delete rest
              </Button>
            </div>
          </div>

          {/* Orphaned files */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Missing from RSS</Label>
            <p className="text-xs text-muted-foreground">Find downloaded files that are no longer in the podcast feed.</p>
            {!showOrphans ? (
              <Button size="sm" variant="outline" onClick={() => setShowOrphans(true)}>
                Scan for orphans
              </Button>
            ) : orphansLoading ? (
              <p className="text-sm text-muted-foreground">Scanning...</p>
            ) : orphanData?.message ? (
              <p className="text-sm text-muted-foreground">{orphanData.message}</p>
            ) : orphanData?.orphaned.length === 0 ? (
              <p className="text-sm text-green-600">No orphaned files found.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{orphanData?.orphaned.length} orphaned files ({formatBytes(orphanData?.orphaned.reduce((s: number, e: any) => s + e.fileSizeBytes, 0) || 0)})</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                  {orphanData?.orphaned.map((e: any) => (
                    <div key={e.filename}>{e.filename} ({formatBytes(e.fileSizeBytes)})</div>
                  ))}
                </div>
                <Button size="sm" variant="destructive" onClick={handleDeleteOrphans} disabled={bulkDelete.isPending}>
                  Delete all orphans
                </Button>
              </div>
            )}
          </div>

          {/* Unavailable episodes (not in RSS + yt-dlp failed) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unavailable source videos</Label>
            <p className="text-xs text-muted-foreground">Find files not in the feed where the source video is confirmed gone (yt-dlp lookup failed).</p>
            {!showUnavailable ? (
              <Button size="sm" variant="outline" onClick={() => setShowUnavailable(true)}>
                Scan for unavailable
              </Button>
            ) : unavailableLoading ? (
              <p className="text-sm text-muted-foreground">Scanning...</p>
            ) : unavailableData?.unavailable.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-green-600">No unavailable episodes found.</p>
                {(unavailableData?.unchecked ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unavailableData!.unchecked} orphaned episode{unavailableData!.unchecked !== 1 ? 's' : ''} not yet checked by yt-dlp — metadata will be fetched in the background.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    {unavailableData?.unavailable.length} unavailable ({formatBytes(unavailableData?.unavailable.reduce((s: number, e: any) => s + e.fileSizeBytes, 0) || 0)})
                  </span>
                </div>
                {(unavailableData?.unchecked ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unavailableData!.unchecked} more orphan{unavailableData!.unchecked !== 1 ? 's' : ''} still pending yt-dlp check.
                  </p>
                )}
                <div className="max-h-32 overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                  {unavailableData?.unavailable.map((e: any) => (
                    <div key={e.filename}>{e.filename} ({formatBytes(e.fileSizeBytes)})</div>
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

// --- Sortable Column Header ---
function SortHeader({
  label, field, currentSort, currentOrder, onSort, className,
}: {
  label: string; field: string; currentSort: string; currentOrder: string;
  onSort: (field: string) => void; className?: string;
}) {
  const active = currentSort === field;
  return (
    <TableHead className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'text-foreground' : 'text-muted-foreground/50'}`} />
        {active && <span className="text-[10px]">{currentOrder === 'asc' ? '\u2191' : '\u2193'}</span>}
      </button>
    </TableHead>
  );
}

// --- Main Page ---
export default function EpisodesPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const { data, isLoading } = useEpisodes(id!, page, pageSize, sort, order);
  const { data: config } = useConfig();
  const player = usePlayerContext();
  const bulkDelete = useBulkDeleteEpisodes(id!);
  const { data: metaStatus } = useQuery<{ cached: number; queued: number; fetching: boolean }>({
    queryKey: ['metadata-status'],
    queryFn: () => api.get('/metadata/status'),
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.fetching || (d?.queued ?? 0) > 0 ? 3000 : 30000;
    },
  });

  const hostname = config?.server?.hostname || 'http://localhost:8080';
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const toggleSelect = (filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
    setSelectAll(false);
  };

  const toggleSelectPage = () => {
    if (!data) return;
    const pageFiles = data.episodes.map((e) => e.filename);
    const allSelected = pageFiles.every((f) => selected.has(f));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageFiles.forEach((f) => next.delete(f));
      } else {
        pageFiles.forEach((f) => next.add(f));
      }
      return next;
    });
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    setSelectAll(true);
  };

  const handleBulkDelete = async () => {
    const filenames = selectAll
      ? undefined // handled server-side — we'll use a special flag
      : Array.from(selected);

    if (!filenames?.length && !selectAll) return;

    // For "select all across pages" we need to fetch all filenames first
    if (selectAll) {
      try {
        const allEpisodes: any = await api.get(
          `/feeds/${id}/episodes?page=1&pageSize=10000&sort=${sort}&order=${order}`,
        );
        const allFilenames = allEpisodes.episodes.map((e: any) => e.filename);
        const result = await bulkDelete.mutateAsync(allFilenames);
        toast.success(`Deleted ${result.deleted} of ${result.total} episodes`);
      } catch (err: any) {
        toast.error(err.message);
      }
    } else {
      try {
        const result = await bulkDelete.mutateAsync(filenames!);
        toast.success(`Deleted ${result.deleted} of ${result.total} episodes`);
      } catch (err: any) {
        toast.error(err.message);
      }
    }

    setSelected(new Set());
    setSelectAll(false);
  };

  const pageAllSelected = data?.episodes.every((e) => selected.has(e.filename)) && (data?.episodes.length ?? 0) > 0;
  const hasSelection = selected.size > 0 || selectAll;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/feeds">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">
            {data?.feedTitle || id}
            {data?.feedTitle && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({id})</span>
            )}
          </h2>
          {data && <Badge variant="secondary">{data.total} episodes</Badge>}
          {metaStatus && metaStatus.queued > 0 && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Fetching metadata... ({metaStatus.queued} remaining)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CleanupDialog feedId={id!} total={data?.total || 0} />
          <Link to={`/feeds/${id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Feed Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectAll ? `All ${data?.total || 0}` : selected.size} selected
          </span>
          {!selectAll && selected.size === (data?.episodes.length || 0) && (data?.total || 0) > pageSize && (
            <Button variant="link" size="sm" className="text-xs" onClick={handleSelectAll}>
              Select all {data?.total} across all pages
            </Button>
          )}
          <div className="ml-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete {selectAll ? `all ${data?.total}` : selected.size}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Delete</DialogTitle>
                  <DialogDescription>
                    Delete {selectAll ? `all ${data?.total}` : selected.size} episodes? This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set()); setSelectAll(false); }}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data?.episodes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No episodes downloaded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={toggleSelectPage}
                      className="rounded border-muted-foreground/50"
                    />
                  </TableHead>
                  <SortHeader label="Episode" field="title" currentSort={sort} currentOrder={order} onSort={handleSort} />
                  <TableHead className="w-20">Format</TableHead>
                  <SortHeader label="Size" field="size" currentSort={sort} currentOrder={order} onSort={handleSort} className="w-20 text-right" />
                  <TableHead className="w-20 text-right">Duration</TableHead>
                  <SortHeader label="Published" field="pubDate" currentSort={sort} currentOrder={order} onSort={handleSort} className="w-28 whitespace-nowrap" />
                  <SortHeader label="Downloaded" field="date" currentSort={sort} currentOrder={order} onSort={handleSort} className="w-28 whitespace-nowrap" />
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.episodes.map((ep) => {
                  const isSelected = selectAll || selected.has(ep.filename);
                  return (
                    <TableRow key={ep.filename} className={isSelected ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => { if (selectAll) { setSelectAll(false); } toggleSelect(ep.filename); }}
                          className="rounded border-muted-foreground/50"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">{ep.title || ep.filename}</div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`${hostname}/${id}/${ep.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-muted-foreground hover:text-blue-500 font-mono"
                            >
                              {ep.filename}
                            </a>
                            {ep.episodeLink && (
                              <a href={ep.episodeLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5">
                                <ExternalLink className="h-3 w-3" /> YouTube
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                player.play(`${hostname}/${id}/${ep.filename}`, ep.title || ep.filename, id!, ep.filename);
                              }}
                              className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5"
                            >
                              {player.track?.filename === ep.filename && player.playing
                                ? <><Pause className="h-3 w-3" /> Playing</>
                                : <><Play className="h-3 w-3" /> Play</>
                              }
                            </button>
                            {ep.inRss === false && (
                              <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-300">
                                Not in RSS
                              </Badge>
                            )}
                          </div>
                          {ep.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl cursor-default" title={ep.description}>{ep.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{ep.format}</Badge></TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">{formatBytes(ep.fileSizeBytes)}</TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">{formatDuration(ep.duration)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{ep.pubDate ? formatDate(ep.pubDate) : '--'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(ep.modifiedAt)}</TableCell>
                      <TableCell className="flex items-center gap-0.5">
                        <RefetchMetadataButton episode={ep} feedId={id!} />
                        <EpisodeDeleteDialog episode={ep} feedId={id!} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
