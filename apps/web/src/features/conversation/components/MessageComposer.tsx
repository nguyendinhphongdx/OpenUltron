'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useSendMessage } from '../hooks/useSendMessage';

export function MessageComposer({ conversationId }: { conversationId: number }) {
  const [content, setContent] = useState('');
  const sendMessage = useSendMessage(conversationId);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed, { onSuccess: () => setContent('') });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border p-4">
      {sendMessage.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(sendMessage.error)}</p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn gì đó… (Enter để gửi, Shift+Enter xuống dòng)"
          rows={2}
          disabled={sendMessage.isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={sendMessage.isPending || !content.trim()}>
          {sendMessage.isPending ? 'Đang gửi…' : 'Gửi'}
        </Button>
      </div>
    </form>
  );
}
