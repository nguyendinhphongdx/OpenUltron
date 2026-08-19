import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="h-screen flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
