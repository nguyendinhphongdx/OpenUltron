import { Sparkles } from 'lucide-react-native';
import { getDefaultApiBaseUrl } from '../../../shared/services';
import { HeroPanel, MetricStrip, ScreenScaffold } from '../../../shared/ui';
import { VoiceSessionCard } from '../../voice';
import { ConversationInboxPreview } from './ConversationInboxPreview';
import { ConversationLaunchPanel } from './ConversationLaunchPanel';

export function ConversationsView() {
  return (
    <ScreenScaffold
      eyebrow="Inbox"
      title="Conversations"
      description="Chat và voice session sẽ sống chung trong cùng conversation, không tách flow riêng."
    >
      <HeroPanel
        eyebrow="Ambient operator"
        title="Nói, nghe, rồi để agent làm việc"
        description="Conversation là nguồn sự thật chung cho chat, voice, tool trace và KB context."
        icon={Sparkles}
        meta="Live ready"
      />
      <MetricStrip
        metrics={[
          { label: 'active agents', value: '3' },
          { label: 'live turns', value: '12' },
          { label: 'tool runs', value: '28' },
        ]}
      />
      <ConversationLaunchPanel />
      <ConversationInboxPreview />
      <VoiceSessionCard apiBaseUrl={getDefaultApiBaseUrl()} />
    </ScreenScaffold>
  );
}
