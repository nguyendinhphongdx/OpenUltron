'use client';

import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';

import { useModelCatalog } from '../hooks/useModelCatalog';
import type { Provider } from '../types/model.types';

/** Browse catalog tĩnh model đã biết của provider (ADR-0010, mở rộng theo yêu cầu — hosted
 * provider liệt kê tay, khác Ollama load từ máy). Model của các provider hosted đã được seed
 * sẵn vào DB qua Alembic migration (2026-08-23) nên panel này chỉ để xem capability, không có
 * action "tạo model" nữa — chọn thẳng ở AgentForm/Settings. Nhúng vào cột giữa của
 * `CredentialManageDialog` khi provider active là `gemini`/`openai`. */
export function ModelCatalogPanel({ provider }: { provider: Provider }) {
  const { data: catalog, isPending } = useModelCatalog(provider);

  if (isPending) return <LoadingState label="Đang tải catalog…" />;
  if (!catalog || catalog.length === 0) {
    return <EmptyState icon={Sparkles} title="Chưa có catalog cho provider này" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {catalog.map((entry) => (
        <div key={entry.model_id} className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">{entry.label}</p>
          <p className="text-xs text-muted-foreground">{entry.model_id}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.is_embedding && <Badge>embedding</Badge>}
            {entry.capabilities.tools && <Badge variant="secondary">tools</Badge>}
            {entry.capabilities.vision && <Badge variant="secondary">vision</Badge>}
            {entry.capabilities.json_mode && <Badge variant="secondary">json_mode</Badge>}
            {entry.capabilities.thinking && <Badge variant="secondary">thinking</Badge>}
            {entry.capabilities.context_window && (
              <Badge variant="secondary">{entry.capabilities.context_window} ctx</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
