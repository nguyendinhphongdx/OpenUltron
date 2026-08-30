import { SettingsForm } from '@/features/settings/components/SettingsForm';
import { PageShell } from '@/components/layout/PageShell';

export default function SettingsPage() {
  return (
    <PageShell title="Settings">
      <SettingsForm />
    </PageShell>
  );
}
