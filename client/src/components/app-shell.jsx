import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  IconBellRinging,
  IconBroadcast,
  IconCamera,
  IconChevronRight,
  IconCommand,
  IconLayoutDashboard,
  IconLifebuoy,
  IconLogout2,
  IconMoon,
  IconRadar2,
  IconSettings,
  IconShieldChevron,
  IconSun,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth, useSettings, useWorkspace } from '../providers';
import { titleCase } from '../lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', icon: IconLayoutDashboard },
  { to: '/incidents', label: 'Incidents', icon: IconRadar2 },
  { to: '/volunteers', label: 'Volunteers', icon: IconUsersGroup },
  { to: '/operators', label: 'Operators', icon: IconShieldChevron },
  { to: '/dispatch-112', label: 'Dispatch 112', icon: IconBroadcast },
  { to: '/cameras', label: 'Cameras', icon: IconCamera },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

const PAGE_META = {
  '/overview': {
    title: 'Overview',
    subtitle: 'Hybrid command deck for live incident coordination and field awareness.',
  },
  '/incidents': {
    title: 'Incidents',
    subtitle: 'Segmented queues, quick dispatch actions, and incident-level drilldown.',
  },
  '/volunteers': {
    title: 'Volunteers',
    subtitle: 'Readiness, proximity, and field capacity across the volunteer network.',
  },
  '/operators': {
    title: 'Operators',
    subtitle: 'Shift control, workload balance, and admin-level oversight.',
  },
  '/dispatch-112': {
    title: 'Dispatch 112',
    subtitle: 'Critical escalation workspace for red-priority emergencies.',
  },
  '/cameras': {
    title: 'Cameras',
    subtitle: 'Camera sector health, coverage awareness, and linked incident load.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Workspace defaults, motion preferences, and operator environment controls.',
  },
};

function resolvePageKey(pathname) {
  if (pathname.startsWith('/volunteers/')) return '/volunteers';
  if (pathname.startsWith('/operators/')) return '/operators';
  return pathname;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useSettings();
  const { urgentPing } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageMeta = PAGE_META[resolvePageKey(location.pathname)] || PAGE_META['/overview'];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,163,255,0.14),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.08),transparent_26%)]" />

      {urgentPing ? (
        <div className="sticky top-0 z-40 border-b border-red-400/15 bg-red-500/10 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 text-sm text-red-100">
            <div className="flex items-center gap-3">
              <IconBellRinging size={18} />
              <span>
                <strong>{urgentPing.incident.type}</strong> flagged at {urgentPing.incident.locationName}
              </span>
            </div>
            <Link to="/dispatch-112" className="text-xs font-semibold uppercase tracking-[0.18em] text-red-100/80">
              open dispatch
            </Link>
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-screen max-w-[1520px] gap-4 px-4 py-4 md:px-6">
        <aside className={cn(
          'fixed inset-y-4 left-4 z-30 flex w-[280px] flex-col rounded-[32px] border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-4 shadow-[var(--panel-shadow)] transition-transform duration-300 md:sticky md:top-4 md:h-[calc(100vh-2rem)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
        )}>
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
              <IconLifebuoy size={22} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-faint)]">Jyldam</div>
              <div className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">Field Ops Admin</div>
            </div>
          </div>

          <Separator className="my-4" />

          <nav className="grid gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'group flex items-center justify-between rounded-3xl px-3 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[color:var(--surface-overlay)] text-[color:var(--text-strong)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                    : 'text-[color:var(--text-soft)] hover:bg-white/[0.03] hover:text-[color:var(--text-strong)]'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                <IconChevronRight size={14} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <Card className="bg-[color:var(--surface-raised)]">
              <CardContent className="grid gap-2 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-faint)]">Current operator</div>
                <div className="font-medium text-[color:var(--text-strong)]">{user?.name}</div>
                <div className="text-sm text-[color:var(--text-muted)]">{titleCase(user?.role)}</div>
              </CardContent>
            </Card>
            <Button variant="secondary" className="w-full justify-between" onClick={toggleTheme}>
              {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
              {dark ? 'Switch to light' : 'Switch to dark'}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-4 z-20 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-[color:var(--line-soft)] bg-[color:var(--surface)] px-4 py-4 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="icon" className="md:hidden" onClick={() => setSidebarOpen((current) => !current)}>
                <IconCommand size={16} />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]">{pageMeta.title}</h1>
                <p className="text-sm text-[color:var(--text-muted)]">{pageMeta.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden min-w-[260px] items-center gap-2 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-2 text-sm text-[color:var(--text-soft)] md:flex">
                <IconCommand size={15} />
                Search incidents, volunteers, cameras
              </div>
              <Badge variant="success">Live socket</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-3 py-2 text-left transition hover:border-[color:var(--line-strong)]">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{user?.name?.charAt(0) || 'J'}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block">
                      <div className="text-sm font-medium text-[color:var(--text-strong)]">{user?.name}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{titleCase(user?.role)}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => navigate(`/operators/${user?.id || 'op1'}`)}>
                    <IconShieldChevron size={16} />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>
                    <IconSettings size={16} />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { logout(); navigate('/login'); }}>
                    <IconLogout2 size={16} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="pb-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
