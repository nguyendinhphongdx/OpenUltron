'use client';

import { useEffect, useState } from 'react';

import { SlidersHorizontal } from 'lucide-react';

import { useAgents } from '@/features/agent';
import { useModels } from '@/features/model';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useSettings, useUpdateSettings } from '../hooks';

export function SettingsForm() {
  const { data: settings, isPending, isError } = useSettings();
  const { data: agents } = useAgents();
  const { data: models } = useModels();
  const updateSettings = useUpdateSettings();

  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [defaultAgentId, setDefaultAgentId] = useState<string>('');

  useEffect(() => {
    if (!settings) return;
    setDefaultModelId(settings.default_model_id?.toString() ?? '');
    setDefaultAgentId(settings.default_agent_id?.toString() ?? '');
  }, [settings]);

  if (isPending) return <LoadingState label="Đang tải cấu hình…" />;
  if (isError) {
    return <EmptyState icon={SlidersHorizontal} tone="destructive" title="Không tải được cấu hình." />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      default_model_id: defaultModelId ? Number(defaultModelId) : null,
      default_agent_id: defaultAgentId ? Number(defaultAgentId) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default_agent_id">Default agent</Label>
        <Select
          value={defaultAgentId || 'none'}
          onValueChange={(v) => setDefaultAgentId(!v || v === 'none' ? '' : v)}
        >
          <SelectTrigger id="default_agent_id" className="w-full">
            {/* base-ui SelectValue chỉ hiện raw value trừ khi map value → label hiển thị. */}
            <SelectValue>
              {(value: string | null) => {
                const agent = agents?.find((a) => a.id.toString() === value);
                return agent ? `${agent.name} (${agent.slug})` : '— Không đặt —';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Không đặt —</SelectItem>
            {agents?.map((agent) => (
              <SelectItem key={agent.id} value={agent.id.toString()}>
                {agent.name} ({agent.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Dùng khi conversation không gán agent cụ thể.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default_model_id">Default model</Label>
        <Select
          value={defaultModelId || 'none'}
          onValueChange={(v) => setDefaultModelId(!v || v === 'none' ? '' : v)}
        >
          <SelectTrigger id="default_model_id" className="w-full">
            <SelectValue>
              {(value: string | null) => {
                const model = models?.find((m) => m.id.toString() === value);
                return model ? `${model.name} (${model.provider}/${model.model_id})` : '— Không đặt —';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Không đặt —</SelectItem>
            {models?.map((model) => (
              <SelectItem key={model.id} value={model.id.toString()}>
                {model.name} ({model.provider}/{model.model_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Fallback cuối cùng khi conversation không gán agent và default agent cũng chưa có model.
        </p>
      </div>

      <Button type="submit" disabled={updateSettings.isPending} className="self-start">
        {updateSettings.isPending ? 'Đang lưu…' : 'Lưu'}
      </Button>

      {updateSettings.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(updateSettings.error)}</p>
      )}
      {updateSettings.isSuccess && <p className="text-sm text-muted-foreground">Đã lưu.</p>}
    </form>
  );
}
