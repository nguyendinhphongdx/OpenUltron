'use client';

import { useEffect } from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
  );
}

/** Đăng ký 1 phím tắt Cmd/Ctrl+`key` toàn app — bỏ qua khi đang gõ trong input/textarea (trừ
 * khi `allowInEditable` bật, cho case như "focus search" cần bắt cả khi đang gõ nơi khác). */
export function useGlobalShortcut(
  key: string,
  callback: () => void,
  options?: { allowInEditable?: boolean },
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== key.toLowerCase()) return;
      if (!options?.allowInEditable && isEditableTarget(event.target)) return;
      event.preventDefault();
      callback();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options?.allowInEditable]);
}
