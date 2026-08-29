'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageSquarePlus, Sparkles } from 'lucide-react';

import { useAgents } from '@/features/agent';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateConversation } from '../hooks/useCreateConversation';

export function NewConversationButton({ className }: { className?: string }) {
  const router = useRouter();
  const { data: agents } = useAgents();
  const createConversation = useCreateConversation();
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState('default');
  const [title, setTitle] = useState('');
  const selectedAgent = agents?.find((agent) => agent.id.toString() === agentId);
  const selectedAgentLabel = selectedAgent?.name ?? 'Agent mặc định từ Settings';

  const handleCreate = () => {
    createConversation.mutate(
      {
        channel: 'web',
        agent_id: agentId === 'default' ? null : Number(agentId),
        title: title.trim() || null,
      },
      {
        onSuccess: (conversation) => {
          setOpen(false);
          setAgentId('default');
          setTitle('');
          router.push(`/conversations/${conversation.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className={className} />}>
        <MessageSquarePlus />
        Hội thoại mới
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl border-white/70 bg-white/90 p-0 shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl">Tạo hội thoại mới</DialogTitle>
            <DialogDescription>
              Chọn agent trước để vào thẳng màn chat, không phải tạo xong rồi mới đi cấu hình.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="conversation-title">Tên hội thoại</Label>
            <Input
              id="conversation-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Research Gemini Live UX"
              className="h-11 rounded-2xl bg-white/80 px-4"
            />
            <p className="text-xs text-muted-foreground">
              Có thể bỏ trống, Ultron sẽ tự dùng tên mặc định.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Agent trả lời</Label>
            <Select value={agentId} onValueChange={(value) => setAgentId(value ?? 'default')}>
              <SelectTrigger className="h-11 w-full rounded-2xl bg-white/80">
                <SelectValue placeholder="Agent mặc định">{selectedAgentLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Agent mặc định từ Settings</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {createConversation.isError && (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(createConversation.error)}
            </p>
          )}
        </DialogBody>

        <DialogFooter className="rounded-b-3xl bg-muted/40 px-6 py-4">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={createConversation.isPending}>
            Huỷ
          </Button>
          <Button onClick={handleCreate} disabled={createConversation.isPending}>
            {createConversation.isPending ? 'Đang tạo…' : 'Bắt đầu chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
