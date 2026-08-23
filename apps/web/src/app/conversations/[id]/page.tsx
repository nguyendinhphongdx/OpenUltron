import { MessageComposer } from '@/features/conversation/components/MessageComposer';
import { MessageThread } from '@/features/conversation/components/MessageThread';
import { PageShell } from '@/components/layout/PageShell';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversationId = Number(id);
  return (
    <PageShell title={`Hội thoại #${id}`}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <MessageThread conversationId={conversationId} />
        </div>
        <MessageComposer conversationId={conversationId} />
      </div>
    </PageShell>
  );
}
