import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarProvider } from './Sidebar';
import StatusBar from './StatusBar';

export default function AppShell() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <StatusBar />
        <main className="md:ml-64 mt-16 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
