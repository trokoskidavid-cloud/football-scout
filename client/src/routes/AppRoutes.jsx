/**
 * Routing module (separate from the root App component).
 * Every screen from Part 1 has at least one component here.
 */
import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import HomePage from '../pages/HomePage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import PlayersPage from '../pages/PlayersPage';
import PlayerDetailsPage from '../pages/PlayerDetailsPage';
import PlayerFormPage from '../pages/PlayerFormPage';
import SearchPage from '../pages/SearchPage';
import ExternalImportPage from '../pages/ExternalImportPage';
import ReportsPage from '../pages/ReportsPage';
import ReportDetailsPage from '../pages/ReportDetailsPage';
import ReportFormPage from '../pages/ReportFormPage';
import { ClubsPage, ClubDetailsPage } from '../pages/ClubsPages';
import MatchesPage from '../pages/MatchesPage';
import DashboardPage from '../pages/DashboardPage';
import { HistoryPage, UsersPage, DbPage, NotFoundPage } from '../pages/AdminPages';

const user = (el) => <ProtectedRoute>{el}</ProtectedRoute>;
const admin = (el) => <ProtectedRoute role="admin">{el}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* guest (everyone) */}
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="players/:id" element={<PlayerDetailsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportDetailsPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="clubs/:id" element={<ClubDetailsPage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="db" element={<DbPage />} />

        {/* registered users */}
        <Route path="players/new" element={user(<PlayerFormPage />)} />
        <Route path="players/:id/edit" element={user(<PlayerFormPage />)} />
        <Route path="reports/new" element={user(<ReportFormPage />)} />
        <Route path="reports/:id/edit" element={user(<ReportFormPage />)} />
        <Route path="external" element={user(<ExternalImportPage />)} />
        <Route path="history" element={user(<HistoryPage />)} />

        {/* administrators */}
        <Route path="admin/users" element={admin(<UsersPage />)} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
