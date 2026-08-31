import { AgentDetailView } from '@/features/agent';

// `AgentDetailView` tự dựng header (avatar/tên/slug/readiness/back/xoá) một khi agent đã tải xong
// — không dùng `PageShell` ở đây (title tĩnh `Agent #<id>` sẽ chỉ nháy 1 khung trước khi View thay
// bằng header thật, giống pattern `KnowledgeBaseDetailShell`/`knowledge-bases/[id]/page.tsx`).
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentDetailView id={Number(id)} />;
}
