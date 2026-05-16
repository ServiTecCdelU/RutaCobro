import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Banknote, Plus, LogOut, Menu, X, Users2, Moon, Sun } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useApp } from '@/context/AppContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import BusquedaGlobal from '@/components/ui/BusquedaGlobal';

export default function Header({ onNuevoPrestamo }) {
  const { user, esAdmin, rol, puedeEditar } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const inicial = user?.email?.[0]?.toUpperCase() ?? 'U';

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
    }`;

  return (
    <header className="bg-white/80 border-b border-slate-200/70 sticky top-0 z-40 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:bg-slate-900/80 dark:border-slate-700/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center flex-shrink-0 shadow-brand-sm group-hover:shadow-brand transition-shadow">
              <Banknote size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base leading-none font-display tracking-tight">
                RutaCobro
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Gestión de cartera
              </div>
            </div>
          </NavLink>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Tablero
            </NavLink>
            <NavLink to="/clientes" className={navLinkClass}>
              Clientes
            </NavLink>
            {esAdmin && (
              <NavLink to="/rutas" className={navLinkClass}>
                Rutas
              </NavLink>
            )}
            <NavLink to="/caja" className={navLinkClass}>
              Caja
            </NavLink>
            {esAdmin && (
              <NavLink to="/equipo" className={navLinkClass}>
                Equipo
              </NavLink>
            )}
          </nav>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <BusquedaGlobal />
          {puedeEditar && (
            <>
              <button
                onClick={onNuevoPrestamo}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all"
              >
                <Plus size={16} /> Nuevo préstamo
              </button>
              <button
                onClick={onNuevoPrestamo}
                aria-label="Nuevo préstamo"
                className="sm:hidden w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-sm active:scale-95 transition-transform"
              >
                <Plus size={18} />
              </button>
            </>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((v) => !v)}
            aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
            className="hidden md:flex w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Avatar + logout desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm ring-1 ring-brand-200/50">
                {inicial}
              </div>
              {rol && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    rol === 'admin'
                      ? 'bg-brand-600 text-white'
                      : rol === 'cobrador'
                        ? 'bg-emerald-100 text-emerald-700'
                        : rol === 'visitante'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {rol === 'admin'
                    ? 'Admin'
                    : rol === 'cobrador'
                      ? 'Cobrador'
                      : rol === 'visitante'
                        ? 'Visitante'
                        : 'Cliente'}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <LogOut size={17} />
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            className="md:hidden w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col gap-1">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Tablero
          </NavLink>
          <NavLink to="/clientes" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Clientes
          </NavLink>
          {esAdmin && (
            <NavLink to="/rutas" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Rutas
            </NavLink>
          )}
          <NavLink to="/caja" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Caja del día
          </NavLink>
          {esAdmin && (
            <NavLink to="/equipo" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Users2 size={14} /> Equipo
              </span>
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors mt-1"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
