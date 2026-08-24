'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAgents } from '@/features/agent';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateConversation } from '../hooks/useCreateConversation';

export function NewConversationButton() {
  const router = useRouter();
  const { data: agents } = useAgents();
  const createConversation = useCreateConversation();
  const [agentId, setAgentId] = useState('');
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    createConversation.mutate(
      { channel: 'web', agent_id: agentId ? Number(agentId) : null },
      {
        onSuccess: (conversation) => {
          setOpen(false);
          router.push(`/conversations/${conversation.id}`);
        },
      },
    );
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Hội thoại mới
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={agentId || null} onValueChange={(v) => setAgentId(v ?? '')}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Agent mặc định">
            {(value: string | null) => {
              const agent = agents?.find((a) => a.id.toString() === value);
              return agent ? agent.name : 'Agent mặc định';
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {agents?.map((agent) => (
            <SelectItem key={agent.id} value={agent.id.toString()}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleCreate} disabled={createConversation.isPending}>
        {createConversation.isPending ? 'Đang tạo…' : 'Tạo'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Huỷ
      </Button>
      {createConversation.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(createConversation.error)}</p>
      )}
    </div>
  );
}
