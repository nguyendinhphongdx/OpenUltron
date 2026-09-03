import { CloudSun, Code2, ShieldAlert } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function ToolsView() {
  return (
    <ScreenScaffold
      eyebrow="Actions"
      title="Tools"
      description="Mobile xem trạng thái tool, approval policy và log ngắn; chỉnh sâu có thể handoff web."
    >
      <ResourceListCard
        title="Available tools"
        description="Mỗi tool cần hiện capability và approval posture ngay ở list."
        items={[
          { title: 'github-search-code', subtitle: 'Readonly connector · no approval required', badge: 'Read', icon: Code2 },
          { title: 'weather-http', subtitle: 'HTTP tool · structured AI params', badge: 'HTTP', icon: CloudSun },
          { title: 'approval-test-echo', subtitle: 'Human-in-the-loop approval test tool', badge: 'Gate', icon: ShieldAlert, tone: 'accent' },
        ]}
      />
    </ScreenScaffold>
  );
}
