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
// Model đôi khi không tuân thủ đúng hướng dẫn (gộp nhiều id vào 1 tag kiểu `[cite:1, 3]` thay vì
// tách riêng `[cite:1][cite:3]`) — regex chấp nhận cả danh sách id cách nhau bởi dấu phẩy để không
// hiện nguyên text thô khi model lệch format.
function withCitationTags(text: string): string {
  return text.replace(/\[cite:([\d\s,]+)\]/g, (_match, idsRaw: string) =>
    idsRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => `<${CITATION_TAG} id="${id}"></${CITATION_TAG}>`)
      .join(''),
  );
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
