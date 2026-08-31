/** Lưu tạm tin nhắn đầu tiên trước khi điều hướng từ `/conversations/new` sang
 * `/conversations/{id}` — phải tạo `Conversation` (có id) trước mới trỏ AG-UI runtime vào được, nên
 * lúc user gõ tin nhắn đầu tiên chưa có id để gửi thẳng. `ConversationRuntime` đọc lại giá trị này
 * đúng 1 lần lúc mount rồi xoá ngay (xem `PendingFirstMessageSender.tsx`). */

const KEY_PREFIX = 'ultron:conversation-draft-message:';

function storageKey(conversationId: number): string {
  return `${KEY_PREFIX}${conversationId}`;
}

export function stashPendingFirstMessage(conversationId: number, text: string): void {
  try {
    sessionStorage.setItem(storageKey(conversationId), text);
  } catch {
    // Storage không khả dụng (Safari private mode, quota đầy...) — bỏ qua, user gõ lại tin nhắn
    // đầu là chấp nhận được, không phải lỗi nghiêm trọng cần chặn flow.
  }
}

export function popPendingFirstMessage(conversationId: number): string | null {
  try {
    const draft = sessionStorage.getItem(storageKey(conversationId));
    if (draft !== null) sessionStorage.removeItem(storageKey(conversationId));
    return draft;
  } catch {
    return null;
  }
}
