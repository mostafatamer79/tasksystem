'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
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
  Languages,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useNotificationsSocket } from '@/lib/socket';
import { useNotifications } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/shared/error-boundary';

import { BookOpen } from 'lucide-react';

type NavKey = 'dashboard' | 'tasks' | 'board' | 'users' | 'plans' | 'notifications' | 'profile';

const navItems: { href: string; labelKey: NavKey; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/tasks', labelKey: 'tasks', icon: ListTodo },
  { href: '/tasks/board', labelKey: 'board', icon: KanbanSquare },
  { href: '/users', labelKey: 'users', icon: Users, adminOnly: true },
  { href: '/plans', labelKey: 'plans', icon: BookOpen },
  { href: '/notifications', labelKey: 'notifications', icon: Bell },
  { href: '/profile', labelKey: 'profile', icon: UserRound },
];

function Logo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn('group flex items-center gap-2.5 px-2', collapsed && 'justify-center px-0', className)}
    >
      <img src="/logo.png" alt="Aurora Logo" className="h-8 w-auto shrink-0 object-contain rounded-md" />
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight">
          Aurora<span className="text-brand-gradient">Team</span>
        </span>
      )}
    </Link>
  );
}

function ThemeToggle() {
  const t = useTranslations('Nav');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
    >
      {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useParams().locale as string;
  const nextLocale = locale === 'ar' ? 'en' : 'ar';
  const label = locale === 'ar' ? 'English' : 'العربية';
  return (
    <button
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      className="rounded-xl p-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
      title={label}
      aria-label={label}
    >
      <Languages className="h-4 w-4" />
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: notifData } = useNotifications(1, 1);
  useNotificationsSocket();

  // Restore sidebar collapse preference (desktop only)
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarOpen') : null;
    if (saved !== null) setSidebarOpen(saved === 'true');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen">
        <div className={cn('hidden border-r p-4 md:block', sidebarOpen ? 'w-64' : 'w-20')}>
          <Skeleton className={cn('mb-6 h-10', sidebarOpen ? 'w-36' : 'w-10')} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
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
  
  const visibleNav = navItems.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    return true;
  });

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
            title={!sidebarOpen ? t(item.labelKey) : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              sidebarOpen ? '' : 'justify-center px-0',
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
            {sidebarOpen && <span className="relative z-10">{t(item.labelKey)}</span>}
            {sidebarOpen && item.href === '/notifications' && unread > 0 && (
              <span className="relative z-10 ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient px-1.5 text-[10px] font-bold text-white shadow-md">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
            {!sidebarOpen && item.href === '/notifications' && unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" />
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
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex',
          sidebarOpen ? 'w-64 p-4' : 'w-20 py-4 px-3'
        )}
      >
        <div className={cn('flex items-center', sidebarOpen ? 'justify-between' : 'justify-center')}>
          <Logo className={cn('mb-7 mt-1', !sidebarOpen && 'mb-6 mt-0')} collapsed={!sidebarOpen} />
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="mb-7 mt-1 rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer"
              aria-label={t('collapseSidebar')}
              title={t('collapseSidebar')}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
        {nav}
        <div
          className={cn(
            'mt-auto flex items-center rounded-2xl border bg-card/60 shadow-soft',
            sidebarOpen ? 'gap-2.5 p-3' : 'flex-col justify-center p-2'
          )}
        >
          <Avatar name={user.name} src={user.avatarUrl} className={cn(!sidebarOpen && 'h-9 w-9')} />
          {sidebarOpen && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.role === 'ADMIN' ? t('administrator') : user.role === 'MODERATOR' ? t('moderator') : user.position ?? t('employee')}
                </p>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  router.replace('/login');
                }}
                className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-90 cursor-pointer"
                aria-label={t('logout')}
                title={t('logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Glass header */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 glass md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Logo />
          </div>
          {/* Desktop sidebar expand toggle */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 md:block cursor-pointer"
              aria-label={t('expandSidebar')}
              title={t('expandSidebar')}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          {/* Command-palette-style search trigger (visual) */}
          <button
            onClick={() => router.push('/tasks')}
            className="hidden h-9 w-72 items-center gap-2.5 rounded-xl border bg-muted/50 px-3 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted md:flex cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t('searchTasks')}</span>
            <kbd className="ms-auto rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              /
            </kbd>
          </button>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
              aria-label={t('notifications')}
              title={t('notifications')}
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
              aria-label={t('menu')}
              title={t('menu')}
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
