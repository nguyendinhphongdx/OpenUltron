'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/api';

import { useSearchKnowledgeBase } from '../hooks/useSearchKnowledgeBase';

export interface KnowledgeSearchPanelProps {
  kbId: number;
}

export function KnowledgeSearchPanel({ kbId }: KnowledgeSearchPanelProps) {
  const search = useSearchKnowledgeBase(kbId);
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    search.mutate({ query, topK: 5 });
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm trong knowledge base…"
        />
        <Button type="submit" size="sm" disabled={search.isPending || !query.trim()}>
          {search.isPending ? 'Đang tìm…' : 'Tìm'}
        </Button>
      </form>

      {search.isError && <p className="text-sm text-red-500">{getApiErrorMessage(search.error)}</p>}

      {search.isSuccess && search.data.length === 0 && (
        <p className="text-sm text-foreground/60">Không tìm thấy kết quả.</p>
      )}

      {search.isSuccess && search.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {search.data.map((result) => (
            <li key={result.chunk.id} className="rounded-md border border-border p-3">
              <p className="text-sm">{result.chunk.content}</p>
              <p className="mt-1 text-xs text-foreground/60">
                cosine distance: {result.score.toFixed(4)} (càng nhỏ càng giống)
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
