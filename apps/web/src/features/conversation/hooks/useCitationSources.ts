import { useAuiState } from '@assistant-ui/react';

import type { CitationSource } from '../types/conversation.types';

const DATA_PART_NAME = 'kb-sources';

// Reference CỐ ĐỊNH cho case rỗng — `useAuiState` so sánh kết quả selector bằng `Object.is`
// (docs/features/kb-citation.md); trả `[]` LITERAL trong selector tạo array mới mỗi lần gọi, khiến
// `useSyncExternalStore` coi là "snapshot đổi" liên tục → warning "getSnapshot should be cached" +
// re-render vô hạn (bug thật gặp khi test live — sửa bằng cách luôn trả về CÙNG 1 reference rỗng).
const EMPTY_SOURCES: readonly CitationSource[] = [];

/**
 * Đọc nguồn KB agent đã dùng trong turn sinh ra message hiện tại (docs/features/kb-citation.md) —
 * nằm ở 1 `data` message part tên `"kb-sources"`. Server gắn part này 2 đường:
 * - Live turn: AG-UI `CUSTOM` event (`chat/service.py::send_agui`) → run-aggregator dựng thành
 *   `data` part ngay trên message đang stream, không cần chờ reload.
 * - Lịch sử đã persist (F5 lại trang): `ConversationRuntime.tsx::toThreadMessageLike` tự thêm lại
 *   part này từ `Message.metadata.sources` khi build lại `ThreadMessageLike.content`.
 * Dùng trong component nằm bên trong `MessagePrimitive.Root` (`ChatMessage.tsx`).
 */
export function useCitationSources(): readonly CitationSource[] {
  return useAuiState((s) => {
    const part = s.message.parts.find(
      (p): p is Extract<typeof p, { type: 'data' }> =>
        p.type === 'data' && p.name === DATA_PART_NAME,
    );
    return part && Array.isArray(part.data) ? (part.data as CitationSource[]) : EMPTY_SOURCES;
  });
}
