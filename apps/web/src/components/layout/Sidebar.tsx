'use client';

import {
  BookOpen,
  Bot,
  Cpu,
  MessagesSquare,
  Settings as SettingsIcon,
  Sparkles,
  Workflow,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/conversations', label: 'Hội thoại', icon: MessagesSquare },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/orchestrators', label: 'Orchestrators', icon: Workflow },
  { href: '/models', label: 'Models', icon: Cpu },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/knowledge-bases', label: 'Knowledge Bases', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Ultron</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
