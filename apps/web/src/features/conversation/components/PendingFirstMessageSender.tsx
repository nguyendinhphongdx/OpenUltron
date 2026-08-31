'use client';

import { useEffect, useRef } from 'react';
import { unstable_useComposerInput } from '@assistant-ui/react';

import { popPendingFirstMessage } from '../services/pending-first-message';

/** Renderless — phải render bên trong `AssistantRuntimeProvider` (dùng `unstable_useComposerInput`,
 * bridge chính thức của assistant-ui cho composer tự chế, xem doc trong node_modules — API còn
 * `unstable_`, "might change without notice" khi bump version, không phải sắp xoá hẳn; re-verify
 * khi nâng version `@assistant-ui/react`). Lúc mount: nếu có tin nhắn nháp lưu sẵn từ
 * `/conversations/new` (`stashPendingFirstMessage`) cho đúng `conversationId` này, tự điền vào
 * composer rồi gửi ngay khi `canSend` — user không phải gõ lại lần 2 sau khi được điều hướng từ
 * trang tạo hội thoại mới.
 *
 * `armedRef` dùng `useRef` (không phải `useState`) có chủ đích — bug thật phát hiện qua
 * `code-reviewer`: React StrictMode (dev) double-invoke effect thứ 2 trong CÙNG 1 pass, trước khi
 * `setArmed(false)` (nếu dùng state) kịp re-render; invocation thứ 2 đọc lại closure cũ (vẫn thấy
 * `armed=true`) → gọi `send()` lần nữa → gửi trùng 2 message cho 1 tin nhắn nháp. Mutate ref có
 * hiệu lực NGAY LẬP TỨC (đồng bộ), invocation thứ 2 thấy `armedRef.current === false` và bỏ qua. */
export function PendingFirstMessageSender({ conversationId }: { conversationId: number }) {
  const { setText, send, canSend } = unstable_useComposerInput();
  const armedRef = useRef(false);

  useEffect(() => {
    const draft = popPendingFirstMessage(conversationId);
    if (draft === null) return;
    setText(draft);
    armedRef.current = true;
    // Chỉ chạy đúng 1 lần lúc mount cho conversationId này — không phụ thuộc `setText` (ổn định
    // theo tham chiếu từ assistant-ui, thêm vào deps sẽ không đổi hành vi nhưng để rõ ràng nguồn
    // trigger duy nhất là đổi conversation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!armedRef.current || !canSend) return;
    armedRef.current = false;
    send();
  }, [canSend, send]);

  return null;
}
