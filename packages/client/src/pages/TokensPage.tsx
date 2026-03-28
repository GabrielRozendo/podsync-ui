import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useTokens, useUpdateTokens } from '@/hooks/use-settings';
import { toast } from 'sonner';
import type { TokensConfig } from '@podsync-ui/shared';

const TOKEN_FIELDS: { key: keyof TokensConfig; label: string; description: string; multi?: boolean }[] = [
  { key: 'youtube', label: 'YouTube', description: 'YouTube Data API v3 key' },
  { key: 'vimeo', label: 'Vimeo', description: 'Vimeo developer API key (supports multiple for rotation)', multi: true },
  { key: 'soundcloud', label: 'SoundCloud', description: 'SoundCloud API key' },
  { key: 'twitch', label: 'Twitch', description: 'Format: CLIENT_ID:CLIENT_SECRET' },
];

export default function TokensPage() {
  const { data: tokens } = useTokens();
  const updateMutation = useUpdateTokens();
  const [edits, setEdits] = useState<Record<string, string | string[]> | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const form = { ...(tokens as Record<string, string | string[]> || {}), ...edits };

  const handleSave = async () => {
    try {
      // Filter out empty values
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(form)) {
        if (Array.isArray(value)) {
          const filtered = value.filter(Boolean);
          if (filtered.length) cleaned[key] = filtered;
        } else if (value) {
          cleaned[key] = value;
        }
      }
      await updateMutation.mutateAsync(cleaned);
      toast.success('Tokens updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">API Tokens</h2>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Tokens</CardTitle>
          <CardDescription>
            API keys used to access YouTube, Vimeo, and other services.
            Tokens can also be set via environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {TOKEN_FIELDS.map((field, idx) => (
            <div key={field.key}>
              {idx > 0 && <Separator className="mb-6" />}
              <div className="space-y-3">
                <div>
                  <Label className="text-base">{field.label}</Label>
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                </div>
                {field.multi ? (
                  <div className="space-y-2">
                    {(Array.isArray(form[field.key]) ? form[field.key] as string[] : [form[field.key] || '']).map((val, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={visible[`${field.key}-${i}`] ? 'text' : 'password'}
                            value={val}
                            onChange={(e) => {
                              const arr = Array.isArray(form[field.key]) ? [...form[field.key] as string[]] : [form[field.key] as string || ''];
                              arr[i] = e.target.value;
                              setEdits({ ...form, [field.key]: arr });
                            }}
                            placeholder={`${field.label} API Key ${i + 1}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setVisible({ ...visible, [`${field.key}-${i}`]: !visible[`${field.key}-${i}`] })}
                        >
                          {visible[`${field.key}-${i}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {i > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const arr = [...(form[field.key] as string[])];
                              arr.splice(i, 1);
                              setEdits({ ...form, [field.key]: arr });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const arr = Array.isArray(form[field.key]) ? [...form[field.key] as string[]] : [form[field.key] as string || ''];
                        arr.push('');
                        setEdits({ ...form, [field.key]: arr });
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Key
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type={visible[field.key] ? 'text' : 'password'}
                      value={(form[field.key] as string) || ''}
                      onChange={(e) => setEdits({ ...form, [field.key]: e.target.value })}
                      placeholder={`${field.label} API Key`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setVisible({ ...visible, [field.key]: !visible[field.key] })}
                    >
                      {visible[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
