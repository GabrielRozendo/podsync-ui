import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Shield, AlertTriangle } from 'lucide-react';
import { useAuth, useUpdateAuth } from '@/hooks/use-settings';
import { toast } from 'sonner';

export default function AuthPage() {
  const { data: auth, isLoading } = useAuth();
  const mutation = useUpdateAuth();

  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null);
  const [usernameOverride, setUsernameOverride] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const enabled = enabledOverride ?? auth?.enabled ?? false;
  const username = usernameOverride ?? auth?.username ?? 'admin';

  const handleSave = async () => {
    try {
      if (enabled && !password && !auth?.enabled) {
        toast.error('Password is required when enabling authentication');
        return;
      }
      await mutation.mutateAsync({
        enabled,
        username: enabled ? username : undefined,
        password: password || undefined,
      });
      setPassword('');
      toast.success(enabled ? 'Authentication enabled' : 'Authentication disabled');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Authentication</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Control
          </CardTitle>
          <CardDescription>
            Protect the Podsync UI with basic authentication. When enabled,
            users must log in to access the management interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require login to access this UI
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabledOverride} />
          </div>

          {enabled && (
            <>
              {!auth?.enabled && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You are enabling authentication. Make sure to remember your credentials —
                    you'll need them to log back in.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsernameOverride(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{auth?.enabled ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={auth?.enabled ? 'Leave blank to keep current' : 'Enter password'}
                  />
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={mutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
