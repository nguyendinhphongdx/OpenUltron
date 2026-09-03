import { Bot, Code2, Search, ShieldCheck } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function AgentsView() {
  return (
    <ScreenScaffold
      eyebrow="Capability"
      title="Agents"
      description="Danh sách agent cá nhân, readiness, model, tools và knowledge binding."
    >
      <ResourceListCard
        title="Agents"
        description="Agent cards tập trung vào readiness, model và capability thay vì form CRUD."
        items={[
          { title: 'Default', subtitle: 'gemini/gemini-3.6-flash · 3 tools · 2 KB', badge: 'Ready', icon: Bot, tone: 'accent' },
          { title: 'Research Buddy', subtitle: 'Web research + summarize + memory notes', badge: 'Voice', icon: Search },
          { title: 'Code Reviewer', subtitle: 'Repository-aware checks, no side effects by default', badge: 'Safe', icon: ShieldCheck },
          { title: 'Builder', subtitle: 'Scaffold feature slices and maintain conventions', badge: 'Code', icon: Code2 },
        ]}
      />
    </ScreenScaffold>
  );
}
