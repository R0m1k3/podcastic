import { LogOut, Sun, Moon } from 'lucide-react';
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
    <header className="mb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {subtitle && (
            <span className="badge badge-accent mb-3">
              {subtitle}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-balance">
            {title}
          </h1>
        </div>

        {/* Right side: theme toggle + user */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all lg:hidden"
            aria-label="Changer le thème"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold leading-tight">{user.username}</p>
                <p className="text-[0.6rem] text-[var(--text-muted)] font-semibold uppercase tracking-widest">Membre</p>
              </div>
              <div className="relative group">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] p-[2px]">
                  <div className="w-full h-full rounded-[10px] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-bold text-[var(--accent-primary)]">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {onLogout && (
                  <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={onLogout}
                      className="glass rounded-[var(--radius-md)] px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-rose)] whitespace-nowrap transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
