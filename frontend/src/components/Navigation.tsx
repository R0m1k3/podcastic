import { Link, useLocation } from 'react-router-dom';
import { Home, Flame, PlusCircle, Library } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/trending', label: 'Trending', icon: Flame },
    { path: '/library', label: 'Library', icon: Library },
    { path: '/add', label: 'Add Podcast', icon: PlusCircle },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed left-6 top-6 bottom-6 w-72 h-auto premium-glass z-50 p-6 hidden lg:flex flex-col gap-8 rounded-[var(--radius-panel)] border border-[var(--border-color)]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl shadow-glow-indigo transition-transform group-hover:scale-110">
            🎙️
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-extrabold tracking-tight">PODCASTIC</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em]">Premium Audio</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex-1 space-y-2">
          {navItems.map((item) => {
            const ActiveIcon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {active && (
                  <div className="absolute left-0 w-1.5 h-6 rounded-full bg-[var(--accent-primary)] shadow-glow-indigo" />
                )}
                <ActiveIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-[var(--accent-primary)]' : ''}`} />
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-[var(--border-color)]">
          <p className="px-2 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">Podcastic Premium v1.0</p>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 premium-glass lg:hidden z-50 flex items-center justify-around px-4 rounded-[var(--radius-card)] shadow-2xl border border-[var(--border-color)]">
        {navItems.map((item) => {
          const MobileIcon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                active ? 'scale-110 text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <MobileIcon className="w-6 h-6" />
              {active && <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shadow-glow-indigo" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
