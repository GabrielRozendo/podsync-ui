import { createBrowserRouter, Outlet } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import FeedsPage from './pages/FeedsPage';
import FeedDetailPage from './pages/FeedDetailPage';
import EpisodesPage from './pages/EpisodesPage';
import TokensPage from './pages/TokensPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import LoginPage from './pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/feeds', element: <FeedsPage /> },
      { path: '/feeds/new', element: <FeedDetailPage /> },
      { path: '/feeds/:id', element: <EpisodesPage /> },
      { path: '/feeds/:id/settings', element: <FeedDetailPage /> },
      { path: '/tokens', element: <TokensPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/auth', element: <AuthPage /> },
    ],
  },
]);
