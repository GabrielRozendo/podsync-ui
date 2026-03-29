import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useTokens, useUnmaskedTokens, useUpdateTokens } from '@/hooks/use-settings';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
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
  const { data: unmaskedTokens, refetch: fetchUnmasked } = useUnmaskedTokens();
  const updateMutation = useUpdateTokens();
  const [edits, setEdits] = useState<Record<string, string | string[]> | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  useUnsavedChanges(edits !== null);

  // Merge: start with masked tokens, overlay unmasked values for visible fields, then user edits
  const masked = (tokens as Record<string, string | string[]>) || {};
  const unmasked = (unmaskedTokens as Record<string, string | string[]>) || {};
  const revealed: Record<string, string | string[]> = {};
  for (const field of TOKEN_FIELDS) {
    const k = field.key;
    if (unmasked[k] !== undefined) {
      if (field.multi) {
        // For multi fields, reveal if any sub-field is visible
        const arr = Array.isArray(unmasked[k]) ? unmasked[k] as string[] : [unmasked[k] as string];
        const maskedArr = Array.isArray(masked[k]) ? masked[k] as string[] : [masked[k] as string || ''];
        revealed[k] = arr.map((v, i) => visible[`${k}-${i}`] ? v : (maskedArr[i] ?? v));
      } else {
        revealed[k] = visible[k] ? unmasked[k] : masked[k];
      }
    }
  }
  const form = { ...masked, ...revealed, ...edits };

  const handleSave = async () => {
    try {
      // Always fetch unmasked values so we never write masked tokens to config
      const { data: real } = await fetchUnmasked();
      const base = (real as Record<string, string | string[]>) || {};
      const merged = { ...base, ...edits };

      // Filter out empty values
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(merged)) {
        if (Array.isArray(value)) {
          const filtered = value.filter(Boolean);
          if (filtered.length) cleaned[key] = filtered;
        } else if (value) {
          cleaned[key] = value;
        }
      }
      await updateMutation.mutateAsync(cleaned);
      setEdits(null);
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
                            type="text"
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
                          onClick={() => {
                            const key = `${field.key}-${i}`;
                            if (!visible[key]) fetchUnmasked();
                            setVisible({ ...visible, [key]: !visible[key] });
                          }}
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
                      type="text"
                      value={(form[field.key] as string) || ''}
                      onChange={(e) => setEdits({ ...form, [field.key]: e.target.value })}
                      placeholder={`${field.label} API Key`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!visible[field.key]) fetchUnmasked();
                        setVisible({ ...visible, [field.key]: !visible[field.key] });
                      }}
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
