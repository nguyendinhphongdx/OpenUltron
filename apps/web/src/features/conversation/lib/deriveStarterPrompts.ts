const FALLBACK_PROMPTS = ['Hỏi tôi bất cứ điều gì'];

const TOOL_PROMPT_HINTS: Record<string, string> = {
  'github-search-code': 'Tìm đoạn code liên quan tới "..." trên GitHub',
  'github-read-file': 'Đọc file "..." trong repo GitHub',
  'write-file': 'Viết 1 file mới trong workspace',
  'run-command': 'Chạy lệnh "..." trong workspace',
  'ssh-execute': 'SSH tới 1 host và chạy lệnh kiểm tra',
};

/** Gợi ý câu hỏi mẫu cho `/conversations/new` sau khi đã chọn agent — không gọi model, suy hoàn
 * toàn từ `description`/tool đã gán để không tốn thêm chi phí/latency (docs/features/conversation-ux-v2.md). */
export function deriveStarterPrompts(
  description: string | null,
  toolSlugs: string[],
): string[] {
  const prompts: string[] = [];

  if (description && description.trim()) {
    prompts.push(`Giúp tôi: ${description.trim()}`);
  }

  for (const slug of toolSlugs) {
    const hint = TOOL_PROMPT_HINTS[slug];
    if (hint && !prompts.includes(hint)) {
      prompts.push(hint);
    }
    if (prompts.length >= 4) break;
  }

  if (prompts.length === 0) return FALLBACK_PROMPTS;
  return prompts.slice(0, 4);
}
