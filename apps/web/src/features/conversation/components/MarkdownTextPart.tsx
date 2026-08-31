'use client';

import { useMessagePartText, useSmooth } from '@assistant-ui/react';
import { Streamdown } from 'streamdown';

import { CitationBadge } from './CitationBadge';
import { useCitationSources } from '../hooks/useCitationSources';

const CITATION_TAG = 'citation';

// Model chèn `[cite:N]` theo hướng dẫn ở `_KB_CITATION_INSTRUCTION`
// (apps/api/app/modules/chat/service.py, docs/features/kb-citation.md) — chuyển thành 1 tag HTML
// tự chế `<citation id="N">` TRƯỚC khi Streamdown parse, khai qua `allowedTags` để lọt sanitizer,
// rồi map `components.citation` để render `CitationBadge`. KHÔNG dùng markdown link (`[N](cite:N)`)
// — thử trước, bị Streamdown's link-safety layer tự chặn hiện "[blocked]" (link-safety chỉ áp cho
// element `<a>` thật, tag tự đặt tên không đụng layer đó).
function withCitationTags(text: string): string {
  return text.replace(/\[cite:(\d+)\]/g, `<${CITATION_TAG} id="$1"></${CITATION_TAG}>`);
}

export function MarkdownTextPart() {
  const { text, status } = useSmooth(useMessagePartText(), true);
  const sources = useCitationSources();

  return (
    <Streamdown
      animated
      isAnimating={status.type === 'running'}
      allowedTags={{ [CITATION_TAG]: ['id'] }}
      components={{
        [CITATION_TAG]: (props) => {
          const id = Number(props.id);
          return <CitationBadge id={id} source={sources.find((s) => s.id === id)} />;
        },
      }}
      className="text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-accent [&_a]:underline-offset-4 [&_pre]:my-3 [&_pre]:rounded-xl [&_table]:text-sm"
    >
      {withCitationTags(text)}
    </Streamdown>
  );
}
