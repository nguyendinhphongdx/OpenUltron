import { ConversationView } from '@/features/conversation';

// Không dùng `PageShell` (khung list/form chuẩn) — hội thoại cần layout full-height riêng
// (header + thread scroll riêng + composer dính đáy), `ConversationView` tự lo phần chrome đó.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationView conversationId={Number(id)} />;
}
