'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';
import { useModels } from '@/features/model';
import { CredentialManageDialog } from '@/features/credential';
import { BookOpen } from 'lucide-react';

import { useCreateAgent } from '../hooks/useCreateAgent';
import { useUpdateAgent } from '../hooks/useUpdateAgent';
import type { Agent, ExecutionStrategy } from '../types/agent.types';

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
  const [executionStrategy, setExecutionStrategy] = useState<ExecutionStrategy>('react');

  useEffect(() => {
    if (!agent) return;
    setSlug(agent.slug);
    setName(agent.name);
    setDescription(agent.description ?? '');
    setSystemPrompt(agent.system_prompt);
    setModelId(agent.model_id.toString());
    setIsOrchestrator(agent.is_orchestrator);
    setExecutionStrategy(agent.execution_strategy);
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
          execution_strategy: executionStrategy,
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
          execution_strategy: executionStrategy,
        },
        { onSuccess },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="execution">Cách thực thi</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-4 pt-3">
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
            {isEditing && (
              <p className="text-xs text-foreground/60">Slug không thể đổi sau khi tạo.</p>
            )}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="model_id">Model</Label>
              <CredentialManageDialog
                trigger={
                  <>
                    <BookOpen data-icon="inline-start" />
                    Browse catalog
                  </>
                }
              />
            </div>
            <Select value={modelId || null} onValueChange={(v) => setModelId(v ?? '')}>
              <SelectTrigger id="model_id" className="w-full">
                {/* base-ui SelectValue chỉ hiện raw value (vd "3") trừ khi truyền children dạng hàm
                 * map value → label hiển thị — khác Radix (tự lấy label từ SelectItem đang chọn). */}
                <SelectValue placeholder="— Chọn model —">
                  {(value: string | null) => {
                    const selected = models?.find((m) => m.id.toString() === value);
                    return selected
                      ? `${selected.name} (${selected.provider}/${selected.model_id})`
                      : '— Chọn model —';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    {model.name} ({model.provider}/{model.model_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground/60">
              Chưa có model phù hợp? Mở &quot;Browse catalog&quot; để xem model đã biết theo
              provider, pull model Ollama, hoặc quản lý credential — tạo Model xong rồi quay lại
              đây chọn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_orchestrator"
              checked={isOrchestrator}
              onCheckedChange={(checked) => setIsOrchestrator(checked === true)}
            />
            <Label htmlFor="is_orchestrator">Là orchestrator (có thể quản lý sub-agent)</Label>
          </div>
        </TabsContent>

        <TabsContent value="execution" className="flex flex-col gap-4 pt-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="execution_strategy">Chiến lược thực thi</Label>
            <Select
              value={executionStrategy}
              onValueChange={(v) => setExecutionStrategy((v as ExecutionStrategy | null) ?? 'react')}
            >
              <SelectTrigger id="execution_strategy" className="w-full">
                <SelectValue placeholder="react">
                  {(value: string | null) =>
                    value === 'plan_execute' ? 'Plan-Execute' : 'ReAct (mặc định)'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">ReAct (mặc định)</SelectItem>
                <SelectItem value="plan_execute">Plan-Execute</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground/60">
              <strong>ReAct</strong>: agent tự quyết định từng bước, xen kẽ suy nghĩ và gọi tool.{' '}
              <strong>Plan-Execute</strong>: agent lập danh sách bước cần làm trước, rồi thực thi
              tuần tự từng bước, cuối cùng tổng hợp câu trả lời. Chỉ áp dụng khi agent này chạy
              trực tiếp (chat/orchestrator gốc) — khi được dùng làm sub-agent của agent khác, luôn
              chạy ReAct bất kể chọn gì ở đây.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu thay đổi' : 'Tạo agent'}
      </Button>

      {mutation.isError && <p className="text-sm text-red-500">{getApiErrorMessage(mutation.error)}</p>}
    </form>
  );
}
