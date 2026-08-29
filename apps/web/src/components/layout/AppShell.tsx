import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="h-screen min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
