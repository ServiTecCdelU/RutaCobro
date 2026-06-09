import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Cobranza = lazy(() => import('@/pages/Cobranza'));
const Clientes = lazy(() => import('@/pages/Clientes'));
const Rutas = lazy(() => import('@/pages/Rutas'));
const Movimientos = lazy(() => import('@/pages/Movimientos'));
const Gastos = lazy(() => import('@/pages/Gastos'));
const Equipo = lazy(() => import('@/pages/Equipo'));
const AceptarInvitacion = lazy(() => import('@/pages/AceptarInvitacion'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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
      <Route
        path="/login"
        element={
          <LazyPage>
            <Login />
          </LazyPage>
        }
      />
      <Route
        path="/aceptar"
        element={
          <LazyPage>
            <AceptarInvitacion />
          </LazyPage>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route
                  index
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <Dashboard />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="cobranza"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <Cobranza />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="clientes"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <Clientes />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="rutas"
                  element={
                    <AdminOnly>
                      <ErrorBoundary>
                        <LazyPage>
                          <Rutas />
                        </LazyPage>
                      </ErrorBoundary>
                    </AdminOnly>
                  }
                />
                <Route
                  path="caja"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <Movimientos />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="gastos"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <Gastos />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="equipo"
                  element={
                    <AdminOnly>
                      <ErrorBoundary>
                        <LazyPage>
                          <Equipo />
                        </LazyPage>
                      </ErrorBoundary>
                    </AdminOnly>
                  }
                />
                <Route
                  path="config"
                  element={
                    <AdminOnly>
                      <ErrorBoundary>
                        <LazyPage>
                          <Configuracion />
                        </LazyPage>
                      </ErrorBoundary>
                    </AdminOnly>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
