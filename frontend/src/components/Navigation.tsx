import { Link, useLocation } from 'react-router-dom';
import { Home, Flame, PlusCircle, Library, Sun, Moon, Headphones } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navigation() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Accueil', icon: Home },
    { path: '/trending',  label: 'Tendances', icon: Flame },
    { path: '/library',   label: 'Bibliothèque', icon: Library },
    { path: '/add',       label: 'Explorer', icon: PlusCircle },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 z-40 hidden lg:flex flex-col p-6">
        <div className="glass rounded-[var(--radius-xl)] h-full flex flex-col p-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-10 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xl shadow-lg shadow-[var(--accent-primary)]/20 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-display font-extrabold tracking-tight leading-none block">PODCASTIC</span>
              <span className="text-[0.6rem] text-[var(--text-muted)] font-semibold uppercase tracking-[0.15em]">Premium Audio</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    active
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-[var(--accent-primary)]' : ''}`} />
                  <span>{item.label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-[0.6rem] text-[var(--text-muted)] font-semibold uppercase tracking-widest">v2.0</span>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
              aria-label="Changer le thème"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-4 left-3 right-3 z-50 lg:hidden">
        <div className="glass rounded-[var(--radius-lg)] flex items-center justify-around px-2 py-3 max-w-md mx-auto shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 rounded-lg ${
                  active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[0.55rem] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
