import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: { username: string; avatar?: string } | null;
  onLogout?: () => void;
}

export default function Header({ title, subtitle, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-light-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex-1">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
                🎙️
              </div>
              <div>
                <h1 className="text-2xl font-bold text-light-900">{title}</h1>
                {subtitle && <p className="text-sm text-light-500">{subtitle}</p>}
              </div>
            </Link>
          </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-light-300 flex items-center justify-center text-sm font-semibold text-light-700">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-light-900">{user.username}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-light-600 hover:text-light-900 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
