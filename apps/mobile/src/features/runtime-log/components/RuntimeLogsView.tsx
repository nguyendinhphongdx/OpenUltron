import { DatabaseZap, Mic2, ShieldAlert } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function RuntimeLogsView() {
  return (
    <ScreenScaffold
      eyebrow="Debug"
      title="Runtime Logs"
      description="Trace ngắn cho mobile: voice state, tool call, approval, reconnect. Log dài handoff web."
    >
      <ResourceListCard
        title="Recent events"
        description="Log ngắn, đọc được khi đang di chuyển; trace dài handoff sang web."
        items={[
          { title: 'voice.session_started', subtitle: 'conversation #24 · listening', badge: 'Voice', icon: Mic2, tone: 'accent' },
          { title: 'tool_call.approval_required', subtitle: 'approval-test-echo waiting for user', badge: 'Gate', icon: ShieldAlert },
          { title: 'kb.search.completed', subtitle: 'Product research · 4 chunks', badge: 'RAG', icon: DatabaseZap },
        ]}
      />
    </ScreenScaffold>
  );
}
