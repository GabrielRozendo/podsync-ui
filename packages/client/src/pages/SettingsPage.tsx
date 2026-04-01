import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, FileText } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ServerConfig, StorageConfig, CleanupConfig, DownloaderConfig, LogConfig } from '@podsync-ui/shared';

function SettingsSection<T extends Record<string, any>>({
  section,
  children,
}: {
  section: string;
  children: (props: { data: T; update: (d: T) => void; saving: boolean }) => React.ReactNode;
}) {
  const { data, isLoading } = useSettings<T>(section);
  const mutation = useUpdateSettings(section);
  const [edits, setEdits] = useState<Partial<T> | null>(null);

  const merged = { ...(data || {} as T), ...edits } as T;

  const save = async () => {
    try {
      await mutation.mutateAsync(merged);
      setEdits(null);
      toast.success(`${section} settings updated`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {children({ data: merged, update: (d: T) => setEdits(d), saving: mutation.isPending })}
        <Button onClick={save} disabled={mutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      <Tabs defaultValue="server" className="space-y-4">
        <TabsList>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
          <TabsTrigger value="downloader">Downloader</TabsTrigger>
          <TabsTrigger value="log">Logging</TabsTrigger>
          <TabsTrigger value="raw">Raw Config</TabsTrigger>
        </TabsList>

        <TabsContent value="server">
          <SettingsSection<ServerConfig> section="server">
            {({ data, update }) => (
              <>
                <CardHeader className="p-0 pb-4"><CardTitle>Server Settings</CardTitle></CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={data.port || ''}
                      onChange={(e) => update({ ...data, port: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input
                      placeholder="https://my.host:8080"
                      value={data.hostname || ''}
                      onChange={(e) => update({ ...data, hostname: e.target.value || undefined })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bind Address</Label>
                    <Input
                      placeholder="0.0.0.0"
                      value={data.bind_address || ''}
                      onChange={(e) => update({ ...data, bind_address: e.target.value || undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Path Prefix</Label>
                    <Input
                      placeholder="(alphanumeric only)"
                      value={data.path || ''}
                      onChange={(e) => update({ ...data, path: e.target.value || undefined })}
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { key: 'web_ui' as const, label: 'Enable Web UI', desc: 'Enable Podsync built-in web UI' },
                    { key: 'tls' as const, label: 'Enable TLS', desc: 'Use HTTPS' },
                    { key: 'no_index' as const, label: 'Block Indexing', desc: 'Block search engine indexing' },
                    { key: 'no_listing' as const, label: 'Disable Listings', desc: 'Return 404 for directory access' },
                    { key: 'debug_endpoints' as const, label: 'Debug Endpoints', desc: 'Enable /debug/vars' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label>{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={data[item.key] || false}
                        onCheckedChange={(v) => update({ ...data, [item.key]: v || undefined })}
                      />
                    </div>
                  ))}
                </div>
                {data.tls && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Certificate Path</Label>
                      <Input
                        value={data.certificate_path || ''}
                        onChange={(e) => update({ ...data, certificate_path: e.target.value || undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Key File Path</Label>
                      <Input
                        value={data.key_file_path || ''}
                        onChange={(e) => update({ ...data, key_file_path: e.target.value || undefined })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </SettingsSection>
        </TabsContent>

        <TabsContent value="storage">
          <SettingsSection<StorageConfig> section="storage">
            {({ data, update }) => (
              <>
                <CardHeader className="p-0 pb-4"><CardTitle>Storage Settings</CardTitle></CardHeader>
                <div className="space-y-2">
                  <Label>Storage Type</Label>
                  <Select value={data.type || 'local'} onValueChange={(v) => update({ ...data, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Filesystem</SelectItem>
                      <SelectItem value="s3">S3-Compatible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(data.type || 'local') === 'local' && (
                  <div className="space-y-2">
                    <Label>Data Directory</Label>
                    <Input
                      value={data.local?.data_dir || ''}
                      onChange={(e) => update({ ...data, local: { ...data.local, data_dir: e.target.value } })}
                    />
                  </div>
                )}
                {data.type === 's3' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Endpoint URL</Label>
                      <Input
                        value={data.s3?.endpoint_url || ''}
                        onChange={(e) => update({ ...data, s3: { ...data.s3, endpoint_url: e.target.value } })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Region</Label>
                        <Input
                          value={data.s3?.region || ''}
                          onChange={(e) => update({ ...data, s3: { ...data.s3, region: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket</Label>
                        <Input
                          value={data.s3?.bucket || ''}
                          onChange={(e) => update({ ...data, s3: { ...data.s3, bucket: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Prefix</Label>
                      <Input
                        value={data.s3?.prefix || ''}
                        onChange={(e) => update({ ...data, s3: { ...data.s3, prefix: e.target.value } })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </SettingsSection>
        </TabsContent>

        <TabsContent value="cleanup">
          <SettingsSection<CleanupConfig> section="cleanup">
            {({ data, update }) => (
              <>
                <CardHeader className="p-0 pb-4"><CardTitle>Global Cleanup Policy</CardTitle></CardHeader>
                <div className="space-y-2">
                  <Label>Keep Last N Episodes</Label>
                  <Input
                    type="number"
                    value={data.keep_last || ''}
                    onChange={(e) => update({ ...data, keep_last: parseInt(e.target.value) || undefined })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to feeds that don't specify their own cleanup policy.
                  </p>
                </div>
              </>
            )}
          </SettingsSection>
        </TabsContent>

        <TabsContent value="downloader">
          <SettingsSection<DownloaderConfig> section="downloader">
            {({ data, update }) => (
              <>
                <CardHeader className="p-0 pb-4"><CardTitle>Downloader Settings</CardTitle></CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Update yt-dlp</Label>
                    <p className="text-xs text-muted-foreground">Automatically update yt-dlp every 24 hours</p>
                  </div>
                  <Switch
                    checked={data.self_update || false}
                    onCheckedChange={(v) => update({ ...data, self_update: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Download Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={data.timeout || ''}
                    onChange={(e) => update({ ...data, timeout: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </>
            )}
          </SettingsSection>
        </TabsContent>

        <TabsContent value="log">
          <SettingsSection<LogConfig> section="log">
            {({ data, update }) => (
              <>
                <CardHeader className="p-0 pb-4"><CardTitle>Log Settings</CardTitle></CardHeader>
                <div className="space-y-2">
                  <Label>Log Filename</Label>
                  <Input
                    value={data.filename || ''}
                    onChange={(e) => update({ ...data, filename: e.target.value || undefined })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Max Size (MB)</Label>
                    <Input type="number" value={data.max_size || ''} onChange={(e) => update({ ...data, max_size: parseInt(e.target.value) || undefined })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Age (days)</Label>
                    <Input type="number" value={data.max_age || ''} onChange={(e) => update({ ...data, max_age: parseInt(e.target.value) || undefined })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Backups</Label>
                    <Input type="number" value={data.max_backups || ''} onChange={(e) => update({ ...data, max_backups: parseInt(e.target.value) || undefined })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Compress Logs</Label>
                    <Switch checked={data.compress || false} onCheckedChange={(v) => update({ ...data, compress: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Debug Mode</Label>
                    <Switch checked={data.debug || false} onCheckedChange={(v) => update({ ...data, debug: v })} />
                  </div>
                </div>
              </>
            )}
          </SettingsSection>
        </TabsContent>

        <TabsContent value="raw">
          <RawConfigViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RawConfigViewer() {
  const { data, isLoading } = useQuery<{ content: string }>({
    queryKey: ['config-raw'],
    queryFn: () => api.get('/config/raw'),
  });

  const copy = () => {
    if (data?.content) {
      navigator.clipboard.writeText(data.content);
      toast.success('Config copied to clipboard');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <CardHeader className="p-0 pb-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              config.toml
            </CardTitle>
          </CardHeader>
          <Button variant="outline" size="sm" onClick={copy} disabled={!data?.content}>
            Copy
          </Button>
        </div>
        <Textarea
          readOnly
          value={isLoading ? 'Loading...' : (data?.content || '# No config file found')}
          className="font-mono text-sm min-h-[500px] bg-muted/30"
        />
      </CardContent>
    </Card>
  );
}
