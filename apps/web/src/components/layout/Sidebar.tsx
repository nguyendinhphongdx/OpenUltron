'use client';

import {
  BookOpen,
  Bot,
  Cpu,
  Home,
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
    <aside className="relative z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 shadow-[1px_0_0_rgb(255_255_255/0.7)_inset] backdrop-blur-2xl md:flex">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Ultron</span>
        </div>
        <span className="rounded-md border border-sidebar-border bg-white/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          AI OS
        </span>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-full border border-sidebar-border bg-white/42 p-1 shadow-sm">
          <Link
            href="/conversations"
            className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-medium text-foreground shadow-sm"
          >
            <Home className="size-3.5" />
            Home
          </Link>
          <Link
            href="/conversations"
            className="flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-white/60 hover:text-foreground"
          >
            <MessagesSquare className="size-3.5" />
            Chat
          </Link>
        </div>
      </div>

      <div className="px-3 pb-2">
        <Link
          href="/conversations"
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-sidebar-border bg-white/58 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-white"
        >
          <Sparkles className="size-4" />
          New chat
        </Link>
      </div>

      <div className="px-4 pb-2 pt-2 text-[11px] font-medium uppercase text-muted-foreground/70">
        Workspace
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border'
                  : 'text-sidebar-foreground/68 hover:bg-white/55 hover:text-sidebar-foreground',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-accent' : 'text-muted-foreground')} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-white/45 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="size-2 rounded-full bg-emerald-500" />
          Agent ready
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Voice, tools, RAG và approval chạy trong cùng workspace.
        </p>
      </div>
    </aside>
  );
}
