import { Link, useLocation } from 'react-router-dom';
import { Home, Flame, PlusCircle, BookOpen, Music2, Search, Library } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home, color: 'text-accent-indigo' },
    { path: '/trending', label: 'Trending', icon: Flame, color: 'text-accent-rose' },
    { path: '/library', label: 'Library', icon: Library, color: 'text-accent-cyan' },
    { path: '/add', label: 'Add Podcast', icon: PlusCircle, color: 'text-accent-violet' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed left-6 top-6 bottom-6 w-72 h-auto premium-glass z-50 p-6 hidden lg:flex flex-col gap-8 rounded-[2.5rem]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-indigo to-accent-rose flex items-center justify-center text-2xl shadow-glow-indigo transition-transform group-hover:scale-110">
            🎙️
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-extrabold text-white tracking-tight">PODCASTIC</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Premium Audio</span>
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
                className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                  active
                    ? 'bg-white/10 text-white shadow-lg shadow-black/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {active && (
                  <div className={`absolute left-0 w-1.5 h-6 rounded-full bg-accent-indigo shadow-[0_0_12px_rgba(99,102,241,0.8)]`} />
                )}
                <ActiveIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-accent-indigo' : ''}`} />
                <span className="text-sm font-semibold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer info/stats */}
        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
           <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/[0.05]">
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">My Stats</p>
             <div className="flex justify-between items-end">
                <span className="text-2xl font-display font-extrabold text-white">2.4k</span>
                <span className="text-[10px] text-accent-indigo font-bold">Mins Listened</span>
             </div>
           </div>
           <p className="px-2 text-[10px] text-slate-600 font-medium">Podcastic Premium © 2026</p>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 premium-glass lg:hidden z-50 flex items-center justify-around px-4 rounded-[2rem] shadow-2xl">
        {navItems.map((item) => {
          const MobileIcon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                active ? 'scale-110 text-accent-indigo' : 'text-slate-500'
              }`}
            >
              <MobileIcon className="w-6 h-6" />
              {active && <div className="w-1 h-1 rounded-full bg-accent-indigo shadow-[0_0_8px_rgba(99,102,241,1)]" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
