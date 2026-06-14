import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Trash2, Save } from 'lucide-react';
import { useFeed, useUpdateFeed, useCreateFeed, useDeleteFeed } from '@/hooks/use-feeds';
import { useSettings } from '@/hooks/use-settings';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { toast } from 'sonner';
import type { CleanupConfig, FeedConfig } from '@podsync-ui/shared';

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: existingFeed, isLoading } = useFeed(isNew ? '' : id!);
  const { data: globalCleanup } = useSettings<CleanupConfig>('cleanup');
  const updateMutation = useUpdateFeed(id!);
  const createMutation = useCreateFeed();
  const deleteMutation = useDeleteFeed();

  const [feedId, setFeedId] = useState('');
  // Defaults only apply to new feeds — for existing feeds we use exactly what's in the TOML
  const newFeedDefaults: Partial<FeedConfig> = {
    url: '',
    format: 'video',
    quality: 'high',
    page_size: 50,
    update_period: '12h',
  };
  const [edits, setEdits] = useState<Partial<FeedConfig> | null>(null);
  useUnsavedChanges(edits !== null);

  // For existing feeds: start from server data only — no client defaults that could mask real values
  const serverData = existingFeed
    ? (({ id: _existingId, ...rest }) => rest)(existingFeed)
    : null;
  const form = isNew
    ? { ...newFeedDefaults, ...edits } as Partial<FeedConfig>
    : { ...serverData, ...edits } as Partial<FeedConfig>;

  const updateField = <K extends keyof FeedConfig>(key: K, value: FeedConfig[K]) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const updateCustom = (key: string, value: any) => {
    setEdits((prev) => ({
      ...prev,
      custom: { ...form.custom, ...prev?.custom, [key]: value },
    }));
  };

  const updateFilter = (key: string, value: any) => {
    setEdits((prev) => ({
      ...prev,
      filters: { ...form.filters, ...prev?.filters, [key]: value === '' ? undefined : value },
    }));
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        if (!feedId.trim()) {
          toast.error('Feed ID is required');
          return;
        }
        await createMutation.mutateAsync({ id: feedId, ...form });
        toast.success('Feed created');
        navigate(`/feeds/${feedId}`);
      } else {
        await updateMutation.mutateAsync(form);
        setEdits(null);
        toast.success('Feed updated');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      toast.success('Feed deleted');
      navigate('/feeds');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to={isNew ? '/feeds' : `/feeds/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isNew ? 'New Feed' : `${form.custom?.title || id} Settings`}
          </h2>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Feed</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{id}"? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader><CardTitle>Basic Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isNew && (
                <div className="space-y-2">
                  <Label htmlFor="feedId">Feed ID</Label>
                  <Input
                    id="feedId"
                    placeholder="my-podcast"
                    value={feedId}
                    onChange={(e) => setFeedId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground">Alphanumeric, hyphens, underscores only.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://www.youtube.com/channel/..."
                  value={form.url || ''}
                  onChange={(e) => updateField('url', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={form.format ?? ''}
                    onValueChange={(v) => updateField('format', v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not set (Podsync default: video)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select value={form.quality || 'high'} onValueChange={(v) => updateField('quality', v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page_size">Page Size</Label>
                  <Input
                    id="page_size"
                    type="number"
                    value={form.page_size || ''}
                    onChange={(e) => updateField('page_size', parseInt(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update_period">Update Period</Label>
                  <Input
                    id="update_period"
                    placeholder="12h"
                    value={form.update_period || ''}
                    onChange={(e) => updateField('update_period', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron_schedule">Cron Schedule (overrides update period)</Label>
                <Input
                  id="cron_schedule"
                  placeholder="@every 12h"
                  value={form.cron_schedule || ''}
                  onChange={(e) => updateField('cron_schedule', e.target.value || undefined)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader><CardTitle>Advanced Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Playlist Sort</Label>
                  <Select value={form.playlist_sort || ''} onValueChange={(v) => updateField('playlist_sort', v as any || undefined)}>
                    <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_height">Max Height (px)</Label>
                  <Input
                    id="max_height"
                    type="number"
                    placeholder="720"
                    value={form.max_height || ''}
                    onChange={(e) => updateField('max_height', parseInt(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filename_template">Filename Template</Label>
                <Input
                  id="filename_template"
                  placeholder="{{pub_date}}_{{title}}_{{id}}"
                  value={form.filename_template || ''}
                  onChange={(e) => updateField('filename_template', e.target.value || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                  Tokens: {'{{id}}'}, {'{{title}}'}, {'{{pub_date}}'}, {'{{feed_id}}'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube_dl_args">yt-dlp Arguments (one per line)</Label>
                <Textarea
                  id="youtube_dl_args"
                  placeholder="--write-sub&#10;--embed-subs"
                  value={(form.youtube_dl_args || []).join('\n')}
                  onChange={(e) => {
                    const args = e.target.value.split('\n').filter(Boolean);
                    updateField('youtube_dl_args', args.length ? args : undefined);
                  }}
                  rows={3}
                />
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include in OPML</Label>
                    <p className="text-xs text-muted-foreground">Make this feed available in the OPML file</p>
                  </div>
                  <Switch
                    checked={form.opml || false}
                    onCheckedChange={(v) => updateField('opml', v || undefined)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Private Feed</Label>
                    <p className="text-xs text-muted-foreground">Prevent podcast indexers from indexing this feed</p>
                  </div>
                  <Switch
                    checked={form.private_feed || false}
                    onCheckedChange={(v) => updateField('private_feed', v || undefined)}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="keep_last">Cleanup: Keep Last N Episodes</Label>
                <Input
                  id="keep_last"
                  type="number"
                  placeholder={
                    globalCleanup?.keep_last != null
                      ? `Inherited from global (${globalCleanup.keep_last})`
                      : 'Inherited from global (not set)'
                  }
                  value={form.clean?.keep_last ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateField('clean', val ? { keep_last: val } : undefined);
                  }}
                />
                {form.clean?.keep_last == null && (
                  <p className="text-xs text-muted-foreground">
                    {globalCleanup?.keep_last != null
                      ? `Using global policy: keep last ${globalCleanup.keep_last} episodes. Set a value here to override per-feed.`
                      : 'No cleanup policy set globally or for this feed — all episodes are kept.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters">
          <Card>
            <CardHeader><CardTitle>Content Filters</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title Match (regex)</Label>
                  <Input
                    placeholder="include.*pattern"
                    value={form.filters?.title || ''}
                    onChange={(e) => updateFilter('title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title Exclude (regex)</Label>
                  <Input
                    placeholder="exclude.*pattern"
                    value={form.filters?.not_title || ''}
                    onChange={(e) => updateFilter('not_title', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description Match (regex)</Label>
                  <Input
                    placeholder="include.*pattern"
                    value={form.filters?.description || ''}
                    onChange={(e) => updateFilter('description', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description Exclude (regex)</Label>
                  <Input
                    placeholder="exclude.*pattern"
                    value={form.filters?.not_description || ''}
                    onChange={(e) => updateFilter('not_description', e.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={form.filters?.min_duration ?? ''}
                    onChange={(e) => updateFilter('min_duration', e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={form.filters?.max_duration ?? ''}
                    onChange={(e) => updateFilter('max_duration', e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Age (days)</Label>
                  <Input
                    type="number"
                    value={form.filters?.min_age ?? ''}
                    onChange={(e) => updateFilter('min_age', e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Age (days)</Label>
                  <Input
                    type="number"
                    value={form.filters?.max_age ?? ''}
                    onChange={(e) => updateFilter('max_age', e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader><CardTitle>Custom Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.custom?.title || ''}
                    onChange={(e) => updateCustom('title', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input
                    value={form.custom?.author || ''}
                    onChange={(e) => updateCustom('author', e.target.value || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.custom?.description || ''}
                  onChange={(e) => updateCustom('description', e.target.value || undefined)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cover Art URL</Label>
                  <Input
                    value={form.custom?.cover_art || ''}
                    onChange={(e) => updateCustom('cover_art', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cover Art Quality</Label>
                  <Select
                    value={form.custom?.cover_art_quality || ''}
                    onValueChange={(v) => updateCustom('cover_art_quality', v || undefined)}
                  >
                    <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={form.custom?.category || ''}
                    onChange={(e) => updateCustom('category', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    placeholder="en"
                    value={form.custom?.lang || ''}
                    onChange={(e) => updateCustom('lang', e.target.value || undefined)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={form.custom?.ownerName || ''}
                    onChange={(e) => updateCustom('ownerName', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Email</Label>
                  <Input
                    type="email"
                    value={form.custom?.ownerEmail || ''}
                    onChange={(e) => updateCustom('ownerEmail', e.target.value || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Custom Link</Label>
                <Input
                  placeholder="https://example.org"
                  value={form.custom?.link || ''}
                  onChange={(e) => updateCustom('link', e.target.value || undefined)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Explicit Content</Label>
                <Switch
                  checked={form.custom?.explicit || false}
                  onCheckedChange={(v) => updateCustom('explicit', v || undefined)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
