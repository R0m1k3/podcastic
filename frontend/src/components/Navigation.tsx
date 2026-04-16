import { Link, useLocation } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-light-200 pt-6 overflow-y-auto hidden lg:flex flex-col">
      {/* Logo */}
      <Link to="/" className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold">
          🎙️
        </div>
        <span className="text-xl font-bold text-light-900">Podcastic</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex-1 px-4">
        <div className="space-y-2">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/dashboard')
                ? 'bg-blue-500 text-white'
                : 'text-light-700 hover:bg-light-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/discover"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/discover')
                ? 'bg-blue-500 text-white'
                : 'text-light-700 hover:bg-light-100'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="font-medium">Discover</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-light-200 text-xs text-light-500">
        <p>Podcastic © 2026</p>
      </div>
    </nav>
  );
}
