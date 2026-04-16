import { X, AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export type AlertType = 'error' | 'info' | 'success' | 'warning';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
}

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'error' 
}: AlertModalProps) {
  if (!isOpen) return null;

  const config = {
    error: {
      icon: AlertCircle,
      color: 'text-accent-rose',
      bg: 'bg-accent-rose/10',
      border: 'border-accent-rose/20',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]'
    },
    success: {
      icon: CheckCircle2,
      color: 'text-accent-cyan',
      bg: 'bg-accent-cyan/10',
      border: 'border-accent-cyan/20',
      glow: 'shadow-[0_0_30_rgba(6,182,212,0.3)]'
    },
    info: {
      icon: Info,
      color: 'text-accent-indigo',
      bg: 'bg-accent-indigo/10',
      border: 'border-accent-indigo/20',
      glow: 'shadow-[0_0_30_rgba(99,102,241,0.3)]'
    }
  };

  const { icon: StatusIcon, color, bg, border, glow } = config[type];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative premium-glass rounded-[var(--radius-panel)] w-full max-w-sm overflow-hidden animate-slide-up border-[var(--border-color)] ${glow}`}>
        <div className="p-8 flex flex-col items-center text-center">
          {/* Header Actions */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
             <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className={`w-16 h-16 ${bg} ${border} border rounded-2xl flex items-center justify-center mb-6`}>
            <StatusIcon className={`w-8 h-8 ${color}`} />
          </div>

          <h3 className="text-xl font-display font-black mb-3">
            {title}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">
            {message}
          </p>
          
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] transition-all border border-[var(--border-color)]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
