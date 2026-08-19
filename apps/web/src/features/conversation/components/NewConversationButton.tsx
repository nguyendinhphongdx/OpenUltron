'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAgents } from '@/features/agent';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
      <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-48">
        <option value="">Agent mặc định</option>
        {agents?.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
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
