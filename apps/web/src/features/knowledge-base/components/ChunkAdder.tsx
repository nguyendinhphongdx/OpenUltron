'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useAddChunk } from '../hooks/useAddChunk';

export interface ChunkAdderProps {
  kbId: number;
}

export function ChunkAdder({ kbId }: ChunkAdderProps) {
  const addChunk = useAddChunk(kbId);
  const [content, setContent] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addChunk.mutate(
      { content },
      {
        onSuccess: () => {
          setContent('');
          setAddedCount((count) => count + 1);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="chunk-content">Thêm chunk</Label>
      <Textarea
        id="chunk-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Nội dung chunk…"
      />
      <Button type="submit" size="sm" disabled={addChunk.isPending || !content.trim()} className="self-start">
        {addChunk.isPending ? 'Đang thêm…' : 'Thêm chunk'}
      </Button>

      {addChunk.isError && <p className="text-sm text-red-500">{getApiErrorMessage(addChunk.error)}</p>}
      {addChunk.isSuccess && (
        <p className="text-sm text-green-600">Đã thêm chunk #{addChunk.data.id}. ({addedCount} chunk đã thêm trong phiên này)</p>
      )}
    </form>
  );
}
