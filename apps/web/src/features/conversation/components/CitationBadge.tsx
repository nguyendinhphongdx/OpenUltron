'use client';

import Link from 'next/link';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { CitationSource } from '../types/conversation.types';

interface CitationBadgeProps {
  id: number;
  source: CitationSource | undefined;
}

/**
 * Badge trích dẫn inline `[cite:N]` (docs/features/kb-citation.md) — `MarkdownTextPart.tsx` thay
 * `[cite:N]` bằng markdown link `[N](cite:N)` trước khi render, rồi override `components.a` để
 * chặn link đó thành badge này thay vì `<a>` thật (không có navigation nào xảy ra).
 * Có `file_id` → badge chính nó là 1 link thật tới `/knowledge-bases/{kb_id}/files/{file_id}`
 * (route xem file có sẵn) — mở trong tab mới để không mất thread chat đang xem.
 */
export function CitationBadge({ id, source }: CitationBadgeProps) {
  if (!source) {
    // Model cite 1 id không tồn tại trong `sources` (bịa số hoặc ngoài range) — hiện số trơn,
    // không tooltip, không throw.
    return <span className="text-xs text-muted-foreground">[{id}]</span>;
  }

  const badgeClassName = cn(
    'mx-0.5 inline-flex size-4 -translate-y-0.5 items-center justify-center rounded-full',
    'bg-accent/15 text-[10px] font-medium text-accent align-middle hover:bg-accent/25',
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          source.file_id !== null ? (
            <Link
              href={`/knowledge-bases/${source.kb_id}/files/${source.file_id}`}
              target="_blank"
              className={badgeClassName}
            />
          ) : (
            <span className={badgeClassName} />
          )
        }
      >
        {id}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-medium">{source.file_name ?? '(không rõ file)'}</span>
          <span className="text-background/80">{source.snippet}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
