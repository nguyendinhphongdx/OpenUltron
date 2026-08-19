'use client';

import {
  BookOpen,
  Bot,
  Cpu,
  MessagesSquare,
  Settings as SettingsIcon,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/conversations', label: 'Hội thoại', icon: MessagesSquare },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/models', label: 'Models', icon: Cpu },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/knowledge-bases', label: 'Knowledge Bases', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border">
      <div className="px-4 py-4">
        <span className="text-sm font-semibold tracking-wide">Ultron</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-white'
                  : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
