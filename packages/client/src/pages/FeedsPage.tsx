import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ExternalLink, Music, Video, Clock, Copy, Check } from 'lucide-react';
import { useFeeds } from '@/hooks/use-feeds';
import { useConfig } from '@/hooks/use-settings';
import { toast } from 'sonner';

function CopyableUrl({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(`${label || 'URL'} copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center gap-1.5 group"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        readOnly
        value={url}
        className="h-7 text-xs font-mono bg-muted/50 border-0 cursor-text select-all"
        onFocus={(e) => e.target.select()}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={copy}
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export default function FeedsPage() {
  const { data: feeds, isLoading } = useFeeds();
  const { data: config } = useConfig();
  const hostname = config?.server?.hostname;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Feeds</h2>
        <Link to="/feeds/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Feed
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : feeds?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No feeds configured yet.</p>
            <Link to="/feeds/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Feed
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeds?.map((feed) => {
            const base = hostname || 'http://localhost:8080';
            const rssUrl = `${base}/${feed.id}/feed.xml`;

            return (
              <Link key={feed.id} to={`/feeds/${feed.id}`} className="block">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {feed.rssTitle || feed.custom?.title || feed.id}
                        {(feed.rssTitle || feed.custom?.title) && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">({feed.id})</span>
                        )}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="secondary">
                          {feed.format === 'audio' ? (
                            <Music className="mr-1 h-3 w-3" />
                          ) : (
                            <Video className="mr-1 h-3 w-3" />
                          )}
                          {feed.format || 'video'}
                        </Badge>
                        {feed.quality && (
                          <Badge variant="outline">{feed.quality}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-700 truncate flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      {feed.url}
                    </a>
                    <CopyableUrl url={rssUrl} label="RSS URL" />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {(feed.update_period || feed.cron_schedule) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {feed.cron_schedule || `Every ${feed.update_period}`}
                        </span>
                      )}
                      {feed.page_size && (
                        <span>{feed.page_size} episodes</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
