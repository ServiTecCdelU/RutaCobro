import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import Rutas from '@/pages/Rutas';
import Movimientos from '@/pages/Movimientos';
import Equipo from '@/pages/Equipo';
import AceptarInvitacion from '@/pages/AceptarInvitacion';

function ProtectedRoute({ children }) {
  const { user, userDoc } = useApp();
  if (user === undefined || (user && userDoc === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { esAdmin } = useApp();
  if (!esAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/aceptar" element={<AceptarInvitacion />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="rutas" element={<AdminOnly><Rutas /></AdminOnly>} />
                <Route path="caja" element={<Movimientos />} />
                <Route path="equipo" element={<AdminOnly><Equipo /></AdminOnly>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
