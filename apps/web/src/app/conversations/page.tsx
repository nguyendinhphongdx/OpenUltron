import { ConversationList } from '@/features/conversation/components/ConversationList';
import { NewConversationButton } from '@/features/conversation/components/NewConversationButton';

export default function ConversationsPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Hội thoại</h1>
        <NewConversationButton />
      </div>
      <ConversationList />
    </main>
  );
}
