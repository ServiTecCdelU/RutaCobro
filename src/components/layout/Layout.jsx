import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Route, Receipt } from 'lucide-react';
import Header from './Header';
import ModalNuevoPrestamo from '@/components/modals/ModalNuevoPrestamo';
import { useApp } from '@/context/AppContext';

export default function Layout({ children }) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const { syncing, esAdmin } = useApp();
  const tabs = [
    { to: '/', icon: LayoutDashboard, label: 'Tablero', end: true },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/caja', icon: Receipt, label: 'Caja' },
    ...(esAdmin ? [{ to: '/rutas', icon: Route, label: 'Rutas' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-60"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 60%)',
        }}
      />
      <Header onNuevoPrestamo={() => setModalNuevo(true)} />
      {syncing && (
        <div className="fixed top-16 inset-x-0 h-0.5 bg-slate-200 overflow-hidden z-30">
          <div className="h-full bg-brand-gradient animate-[slide_1.2s_ease-in-out_infinite]"
               style={{ width: '40%' }} />
        </div>
      )}

      <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-10">
        {children}
      </main>

      {/* Bottom nav — solo mobile */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-popover rounded-2xl z-40 flex p-1.5">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {modalNuevo && <ModalNuevoPrestamo onClose={() => setModalNuevo(false)} />}
    </div>
  );
}
