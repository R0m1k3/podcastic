import { Link } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: { username: string; avatar?: string } | null;
  onLogout?: () => void;
}

export default function Header({ title, subtitle, user, onLogout }: HeaderProps) {
  return (
    <header className="mb-12">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div className="flex-1">
          <div className="inline-block px-3 py-1 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-[10px] font-bold text-accent-indigo uppercase tracking-widest mb-3">
             {subtitle || "Exploration Audio"}
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight text-balance leading-tight">
            {title}
          </h1>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-6">
             <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-white tracking-wide">{user.username}</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Premium Member</span>
             </div>
             <div className="relative group">
                <div className="w-12 h-12 rounded-2xl p-[1px] bg-gradient-to-tr from-accent-indigo/50 to-accent-rose/50 group-hover:from-accent-indigo group-hover:to-accent-rose transition-all">
                  <div className="w-full h-full rounded-2xl bg-obsidian-800 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-accent-indigo">{user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                
                {/* Profile Popup (Minimal) */}
                {onLogout && (
                  <button 
                    onClick={onLogout}
                    className="absolute top-full right-0 mt-4 opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 premium-glass px-4 py-2 flex items-center gap-2 hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4 text-accent-rose" />
                    <span className="text-xs font-bold text-white whitespace-nowrap">Logout</span>
                  </button>
                )}
             </div>
          </div>
        )}
      </div>
    </header>
  );
}
