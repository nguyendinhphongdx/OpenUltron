'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';
import { useModels } from '@/features/model';

import { useCreateAgent } from '../hooks/useCreateAgent';
import { useUpdateAgent } from '../hooks/useUpdateAgent';
import type { Agent } from '../types/agent.types';

interface AgentFormProps {
  /** Khi có `agent` → chế độ edit (slug bị khoá, dùng useUpdateAgent). Không có → chế độ create. */
  agent?: Agent;
  onSuccess?: (agent: Agent) => void;
}

export function AgentForm({ agent, onSuccess }: AgentFormProps) {
  const isEditing = Boolean(agent);
  const { data: models } = useModels();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent(agent?.id ?? -1);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelId, setModelId] = useState('');
  const [isOrchestrator, setIsOrchestrator] = useState(false);

  useEffect(() => {
    if (!agent) return;
    setSlug(agent.slug);
    setName(agent.name);
    setDescription(agent.description ?? '');
    setSystemPrompt(agent.system_prompt);
    setModelId(agent.model_id.toString());
    setIsOrchestrator(agent.is_orchestrator);
  }, [agent]);

  const mutation = isEditing ? updateAgent : createAgent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId) return;

    if (isEditing) {
      updateAgent.mutate(
        {
          name,
          description: description || null,
          system_prompt: systemPrompt,
          model_id: Number(modelId),
          is_orchestrator: isOrchestrator,
        },
        { onSuccess },
      );
    } else {
      createAgent.mutate(
        {
          slug,
          name,
          description: description || null,
          system_prompt: systemPrompt,
          model_id: Number(modelId),
          is_orchestrator: isOrchestrator,
        },
        { onSuccess },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isEditing}
          placeholder="vd: research-agent"
          required
        />
        {isEditing && <p className="text-xs text-foreground/60">Slug không thể đổi sau khi tạo.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Tên</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Mô tả</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="system_prompt">System prompt</Label>
        <Textarea
          id="system_prompt"
          rows={6}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="model_id">Model</Label>
        <Select id="model_id" value={modelId} onChange={(e) => setModelId(e.target.value)} required>
          <option value="">— Chọn model —</option>
          {models?.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider}/{model.model_id})
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_orchestrator"
          checked={isOrchestrator}
          onChange={(e) => setIsOrchestrator(e.target.checked)}
        />
        <Label htmlFor="is_orchestrator">Là orchestrator (có thể quản lý sub-agent)</Label>
      </div>

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu thay đổi' : 'Tạo agent'}
      </Button>

      {mutation.isError && <p className="text-sm text-red-500">{getApiErrorMessage(mutation.error)}</p>}
    </form>
  );
}
