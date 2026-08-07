'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  ListTodo,
  KanbanSquare,
  Users,
  Bell,
  UserRound,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useNotificationsSocket } from '@/lib/socket';
import { useNotifications } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/shared/error-boundary';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/tasks/board', label: 'Board', icon: KanbanSquare },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn('group flex items-center gap-2.5 px-2', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-brand-gradient opacity-50 blur-md transition-opacity group-hover:opacity-80" />
        <div className="relative rounded-xl bg-brand-gradient p-1.5 text-white shadow-md">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
      </div>
      <span className="text-lg font-bold tracking-tight">
        Task<span className="text-brand-gradient">Flow</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
      aria-label="Toggle theme"
    >
      {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notifData } = useNotifications(1, 1);
  useNotificationsSocket();

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 border-r p-4 md:block">
          <Skeleton className="mb-6 h-10 w-36" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="mb-4 h-9 w-56" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';
  const unread = notifData?.unread ?? 0;
  const visibleNav = navItems.filter((i) => !i.adminOnly || isAdmin);

  const isActive = (href: string) =>
    href === '/tasks' ? pathname === '/tasks' : pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <nav className="flex flex-1 flex-col gap-1.5">
      {visibleNav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl border border-primary/20 bg-accent shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <item.icon className={cn('relative z-10 h-4 w-4', active && 'text-primary')} />
            <span className="relative z-10">{item.label}</span>
            {item.href === '/notifications' && unread > 0 && (
              <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white shadow-md">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <div className="app-bg" />

      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border/60 bg-card/40 p-4 backdrop-blur-xl md:flex">
        <Logo className="mb-7 mt-1" />
        {nav}
        <div className="mt-auto flex items-center gap-2.5 rounded-2xl border bg-card/60 p-3 shadow-soft">
          <Avatar name={user.name} src={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.role === 'ADMIN' ? 'Administrator' : user.position ?? 'Employee'}
            </p>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90 cursor-pointer"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Glass header */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 glass md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Logo />
          </div>
          {/* Command-palette-style search trigger (visual) */}
          <button
            onClick={() => router.push('/tasks')}
            className="hidden h-9 w-72 items-center gap-2.5 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted md:flex cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search tasks…</span>
            <kbd className="ml-auto rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              /
            </kbd>
          </button>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    key={unread}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-gradient px-1 text-[9px] font-bold text-white shadow-md"
                  >
                    {unread > 99 ? '99+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            <Link href="/profile" className="transition-transform hover:scale-105 active:scale-95 md:hidden">
              <Avatar name={user.name} src={user.avatarUrl} className="h-8 w-8" />
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-xl p-2 transition-colors hover:bg-muted md:hidden cursor-pointer"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="glass-strong fixed inset-x-3 top-[68px] z-30 rounded-2xl p-3 shadow-lift md:hidden"
            >
              {nav}
            </motion.div>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 px-4 pb-12 pt-6 md:px-8 md:pt-8">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
