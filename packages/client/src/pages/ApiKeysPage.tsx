import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Plus, Copy, Check, Trash2, Ban } from 'lucide-react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from '@/hooks/use-api-keys';
import { toast } from 'sonner';
import type { ApiKeyScope } from '@podsync-ui/shared';
import { API_KEY_SCOPES } from '@podsync-ui/shared';

const SCOPE_GROUPS: { label: string; scopes: { scope: ApiKeyScope; label: string }[] }[] = [
  {
    label: 'Config',
    scopes: [
      { scope: 'config:read', label: 'Read' },
      { scope: 'config:write', label: 'Write' },
    ],
  },
  {
    label: 'Feeds',
    scopes: [
      { scope: 'feeds:read', label: 'Read' },
      { scope: 'feeds:write', label: 'Write' },
    ],
  },
  {
    label: 'Episodes',
    scopes: [
      { scope: 'episodes:read', label: 'Read' },
      { scope: 'episodes:write', label: 'Write' },
    ],
  },
  {
    label: 'Tokens',
    scopes: [
      { scope: 'tokens:read', label: 'Read' },
      { scope: 'tokens:write', label: 'Write' },
    ],
  },
  {
    label: 'Settings',
    scopes: [
      { scope: 'settings:read', label: 'Read' },
      { scope: 'settings:write', label: 'Write' },
    ],
  },
  {
    label: 'Docker',
    scopes: [
      { scope: 'docker:read', label: 'Read' },
      { scope: 'docker:write', label: 'Write' },
    ],
  },
  {
    label: 'Auth',
    scopes: [
      { scope: 'auth:read', label: 'Read' },
      { scope: 'auth:write', label: 'Write' },
    ],
  },
];

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never' },
];

export default function ApiKeysPage() {
  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();

  const [showCreate, setShowCreate] = useState(false);
  const [showKeyResult, setShowKeyResult] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [copied, setCopied] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('30');
  const [selectedScopes, setSelectedScopes] = useState<Set<ApiKeyScope>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  const resetForm = () => {
    setName('');
    setExpiry('30');
    setSelectedScopes(new Set());
    setIsAdmin(false);
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    const scopes: ApiKeyScope[] = isAdmin ? ['admin'] : Array.from(selectedScopes);
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (scopes.length === 0) {
      toast.error('Select at least one scope');
      return;
    }

    try {
      const result = await createKey.mutateAsync({
        name: name.trim(),
        scopes,
        expiresInDays: expiry === 'never' ? null : parseInt(expiry, 10),
      });
      setNewKeyValue(result.key);
      setShowCreate(false);
      setShowKeyResult(true);
      resetForm();
      toast.success('API key created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create key');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? It will no longer be usable.')) return;
    try {
      await revokeKey.mutateAsync(id);
      toast.success('API key revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke key');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this API key?')) return;
    try {
      await deleteKey.mutateAsync(id);
      toast.success('API key deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete key');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <CardTitle>External API Access</CardTitle>
          </div>
          <CardDescription>
            Create API keys for programmatic access. Use them with the{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{key.prefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(key.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {key.expiresAt ? (
                        <span className={isExpired(key.expiresAt) ? 'text-destructive' : ''}>
                          {formatDate(key.expiresAt)}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(key.lastUsedAt)}</TableCell>
                    <TableCell>
                      {key.revoked ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : isExpired(key.expiresAt) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!key.revoked && !isExpired(key.expiresAt) && (
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new key for programmatic API access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., CI Pipeline, Home Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Admin (all permissions)</p>
                  <p className="text-xs text-muted-foreground">Full access to all API endpoints</p>
                </div>
                <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
              </div>
              {!isAdmin && (
                <div className="space-y-2 rounded-md border p-3">
                  {SCOPE_GROUPS.map((group) => (
                    <div key={group.label} className="flex items-center justify-between py-1">
                      <span className="text-sm">{group.label}</span>
                      <div className="flex gap-2">
                        {group.scopes.map(({ scope, label }) => (
                          <label key={scope} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScopes.has(scope)}
                              onChange={() => toggleScope(scope)}
                              className="rounded"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createKey.isPending}>
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result Dialog */}
      <Dialog open={showKeyResult} onOpenChange={setShowKeyResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription className="break-all font-mono text-sm">
              {newKeyValue}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button variant="outline" onClick={() => setShowKeyResult(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
