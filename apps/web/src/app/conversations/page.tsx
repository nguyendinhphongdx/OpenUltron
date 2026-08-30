import { ConversationList, NewConversationButton } from '@/features/conversation';
import { PageShell } from '@/components/layout/PageShell';

export default function ConversationsPage() {
  return (
    <PageShell
      title="Hội thoại"
      description="Không gian chat, voice và agent handoff của Ultron."
      action={<NewConversationButton />}
      maxWidth="wide"
    >
      <ConversationList />
    </PageShell>
  );
}
