import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Rss,
  Key,
  KeyRound,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import MiniPlayer from '@/components/player/MiniPlayer';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/feeds', icon: Rss, label: 'Feeds' },
  { to: '/tokens', icon: Key, label: 'API Tokens' },
  { to: '/api-keys', icon: KeyRound, label: 'API Keys' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/auth', icon: Shield, label: 'Authentication' },
];

interface HealthResponse {
  version: { commit: string; buildTime: string };
}

export default function Sidebar() {
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    staleTime: Infinity,
  });

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Rss className="mr-2 h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">Podsync UI</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <MiniPlayer />
      <div className="border-t px-4 py-3 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await api.post('/auth/logout');
            window.location.href = '/login';
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
        {health?.version && (
          <div className="px-2">
            <p className="text-xs text-muted-foreground">
              Build: {health.version.commit}
            </p>
            {health.version.buildTime && (
              <p className="text-xs text-muted-foreground">
                {new Date(health.version.buildTime).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
