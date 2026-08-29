import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RedefinirSenhaPage from '../pages/RedefinirSenhaPage';
import LoadingSpinner from '../components/common/LoadingSpinner';

// O painel administrativo puxa o Chart.js (biblioteca pesada) — carregá-lo sob
// demanda evita que quem só visita o site da pizzaria baixe esse código à toa.
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner label="Carregando painel..." /></div>}>
            <AdminDashboardPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
