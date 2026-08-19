'use client';

import { useEffect, useState } from 'react';

import { useAgents } from '@/features/agent';
import { useModels } from '@/features/model';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải cấu hình…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được cấu hình.</p>;

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
          id="default_agent_id"
          value={defaultAgentId}
          onChange={(e) => setDefaultAgentId(e.target.value)}
        >
          <option value="">— Không đặt —</option>
          {agents?.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.slug})
            </option>
          ))}
        </Select>
        <p className="text-xs text-foreground/60">
          Dùng khi conversation không gán agent cụ thể.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default_model_id">Default model</Label>
        <Select
          id="default_model_id"
          value={defaultModelId}
          onChange={(e) => setDefaultModelId(e.target.value)}
        >
          <option value="">— Không đặt —</option>
          {models?.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider}/{model.model_id})
            </option>
          ))}
        </Select>
        <p className="text-xs text-foreground/60">
          Fallback cuối cùng khi conversation không gán agent và default agent cũng chưa có model.
        </p>
      </div>

      <Button type="submit" disabled={updateSettings.isPending} className="self-start">
        {updateSettings.isPending ? 'Đang lưu…' : 'Lưu'}
      </Button>

      {updateSettings.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(updateSettings.error)}</p>
      )}
      {updateSettings.isSuccess && <p className="text-sm text-green-600">Đã lưu.</p>}
    </form>
  );
}
