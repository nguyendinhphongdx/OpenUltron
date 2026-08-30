'use client';

import { useMessagePartText, useSmooth } from '@assistant-ui/react';
import { Streamdown } from 'streamdown';

export function MarkdownTextPart() {
  const { text, status } = useSmooth(useMessagePartText(), true);

  return (
    <Streamdown
      animated
      isAnimating={status.type === 'running'}
      className="text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-accent [&_a]:underline-offset-4 [&_pre]:my-3 [&_pre]:rounded-xl [&_table]:text-sm"
    >
      {text}
    </Streamdown>
  );
}
