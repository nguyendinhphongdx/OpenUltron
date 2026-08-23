import { ConversationList } from '@/features/conversation/components/ConversationList';
import { NewConversationButton } from '@/features/conversation/components/NewConversationButton';
import { PageShell } from '@/components/layout/PageShell';

export default function ConversationsPage() {
  return (
    <PageShell title="Hội thoại" description="Chat trực tiếp với 1 agent." action={<NewConversationButton />}>
      <ConversationList />
    </PageShell>
  );
}
