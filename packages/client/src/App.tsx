import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import FeedsPage from './pages/FeedsPage';
import FeedDetailPage from './pages/FeedDetailPage';
import EpisodesPage from './pages/EpisodesPage';
import TokensPage from './pages/TokensPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/feeds" element={<FeedsPage />} />
        <Route path="/feeds/new" element={<FeedDetailPage />} />
        <Route path="/feeds/:id" element={<EpisodesPage />} />
        <Route path="/feeds/:id/settings" element={<FeedDetailPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Route>
    </Routes>
  );
}
