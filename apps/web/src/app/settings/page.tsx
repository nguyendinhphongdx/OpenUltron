import { SettingsForm } from '@/features/settings/components/SettingsForm';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>
      <SettingsForm />
    </main>
  );
}
