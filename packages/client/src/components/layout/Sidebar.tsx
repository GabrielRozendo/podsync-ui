import { createContext, useContext, useState } from 'react';
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
  Menu,
  X,
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

interface SidebarContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({ open: false, setOpen: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function MobileMenuButton() {
  const { open, setOpen } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={() => setOpen(!open)}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

export default function Sidebar() {
  const { open, setOpen } = useSidebar();
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    staleTime: Infinity,
  });

  // Close sidebar on navigation (mobile)
  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-card transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Rss className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Podsync UI</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={handleNavClick}
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
    </>
  );
}
