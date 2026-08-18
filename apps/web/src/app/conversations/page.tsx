import { ConversationList } from '@/features/conversation/components/ConversationList';

export default function ConversationsPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="border-b border-border px-4 py-4 text-lg font-semibold">Hội thoại</h1>
      <ConversationList />
    </main>
  );
}
