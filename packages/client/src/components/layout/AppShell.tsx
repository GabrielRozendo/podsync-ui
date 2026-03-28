import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <StatusBar />
      <main className="ml-64 mt-16 p-6">
        <Outlet />
      </main>
    </div>
  );
}
