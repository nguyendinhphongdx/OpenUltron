import { MessageComposer } from '@/features/conversation/components/MessageComposer';
import { MessageThread } from '@/features/conversation/components/MessageThread';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversationId = Number(id);
  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col">
      <h1 className="border-b border-border px-4 py-4 text-lg font-semibold">
        Hội thoại #{id}
      </h1>
      <div className="flex-1 overflow-y-auto">
        <MessageThread conversationId={conversationId} />
      </div>
      <MessageComposer conversationId={conversationId} />
    </main>
  );
}
