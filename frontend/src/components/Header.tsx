import { Link } from 'react-router-dom';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: { username: string; avatar?: string } | null;
  onLogout?: () => void;
}

export default function Header({ title, subtitle, user, onLogout }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="mb-12">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div className="flex-1">
          <div className="inline-block px-3 py-1 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-3">
             {subtitle || "Exploration Audio"}
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-balance leading-tight">
            {title}
          </h1>
        </div>

        {/* User Profile + Theme Toggle */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shadow-lg group-theme-toggle"
            title="Changer de thème"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user && (
            <div className="flex items-center gap-4 sm:gap-6">
               <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold tracking-wide">{user.username}</span>
                  <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-widest">Premium Member</span>
               </div>
               <div className="relative group/profile">
                  <div className="w-12 h-12 rounded-2xl p-[1px] bg-gradient-to-tr from-[var(--accent-primary)]/50 to-[var(--accent-secondary)]/50 group-hover/profile:from-[var(--accent-primary)] group-hover/profile:to-[var(--accent-secondary)] transition-all">
                    <div className="w-full h-full rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-[var(--accent-primary)]">{user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Profile Popup (Minimal) */}
                  {onLogout && (
                    <button 
                      onClick={onLogout}
                      className="absolute top-full right-0 mt-4 opacity-0 scale-90 translate-y-2 group-hover/profile:opacity-100 group-hover/profile:scale-100 group-hover/profile:translate-y-0 transition-all duration-300 premium-glass px-4 py-2 flex items-center gap-2 hover:bg-[var(--accent-primary)]/10"
                    >
                      <LogOut className="w-4 h-4 text-accent-rose" />
                      <span className="text-xs font-bold whitespace-nowrap">Logout</span>
                    </button>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
