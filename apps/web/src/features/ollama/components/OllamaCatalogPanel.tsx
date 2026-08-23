'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';

import { useOllamaCatalog, useOllamaInstalled, usePullOllamaModel } from '../hooks';

/** Browse catalog tĩnh (ADR-0011) + pull model Ollama về máy, xem tiến trình qua SSE. Nhúng vào
 * cột giữa của `CredentialManageDialog` khi provider đang chọn là `ollama`. */
export function OllamaCatalogPanel() {
  const { data: catalog, isPending: catalogPending } = useOllamaCatalog();
  const { data: installed } = useOllamaInstalled();
  const { pull, pullingModel, event, error } = usePullOllamaModel();
  const [selectedTag, setSelectedTag] = useState<Record<string, string>>({});

  const installedNames = new Set((installed ?? []).map((m) => m.name.split(':')[0]));

  if (catalogPending) return <LoadingState label="Đang tải catalog…" />;
  if (!catalog || catalog.length === 0) {
    return <EmptyState icon={Download} title="Không có catalog nào" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {catalog.map((entry) => {
        const tag = selectedTag[entry.name] ?? entry.suggested_tags[0] ?? 'latest';
        const model = `${entry.name}:${tag}`;
        const isPulling = pullingModel === model;
        return (
          <div key={entry.name} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{entry.name}</p>
              {installedNames.has(entry.name) && <Badge variant="secondary">đã cài</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{entry.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <select
                className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                value={tag}
                onChange={(e) => setSelectedTag((prev) => ({ ...prev, [entry.name]: e.target.value }))}
              >
                {entry.suggested_tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={isPulling} onClick={() => pull(model)}>
                <Download data-icon="inline-start" />
                {isPulling ? 'Đang pull…' : 'Pull'}
              </Button>
            </div>
            {isPulling && event && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width:
                        event.completed && event.total
                          ? `${Math.round((event.completed / event.total) * 100)}%`
                          : '100%',
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{event.status}</p>
              </div>
            )}
            {pullingModel === model && error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
