import { MessageThread } from '@/features/conversation/components/MessageThread';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="border-b border-border px-4 py-4 text-lg font-semibold">
        Hội thoại #{id}
      </h1>
      <MessageThread conversationId={Number(id)} />
    </main>
  );
}
