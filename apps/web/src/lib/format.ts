/**
 * Helper format ngày dùng chung — trước khi thêm file này, `KnowledgeBaseRow`/`KnowledgeBaseCard`/
 * `ConversationList` mỗi nơi tự viết `toLocaleDateString('vi-VN')`/`Intl.DateTimeFormat` riêng
 * (docs/conventions/02-frontend-nextjs.md, "Helper dùng ở ≥ 2 feature → đưa vào `src/lib/`").
 */
export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', options).format(date);
}
