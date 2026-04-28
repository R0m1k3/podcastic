import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Sparkles, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const response = await authService.login(formData.email, formData.password);
        authService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        navigate('/dashboard');
      } else {
        const response = await authService.register(
          formData.email,
          formData.password,
          formData.username
        );
        authService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background Auras */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,var(--accent-glow),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.1),transparent_40%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-glow)] blur-[120px] rounded-full animate-aura" />

      <div className="w-full max-w-lg relative z-10 reveal">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl mx-auto mb-6 shadow-glow-indigo transform hover:scale-110 transition-transform duration-500">
            🎙️
          </div>
          <h1 className="text-5xl font-display font-black mb-3 tracking-tighter">PODCASTIC</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em]">
             <Sparkles className="w-3 h-3" />
             Votre espace audio
          </div>
        </div>

        {/* Form Card */}
        <div className="premium-glass p-8 lg:p-12 rounded-[var(--radius-panel)] shadow-2xl">
          <div className="flex p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-10">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isLogin 
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                !isLogin 
                  ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type="text"
                  name="username"
                  placeholder="NOM D'UTILISATEUR"
                  value={formData.username}
                  onChange={handleChange}
                  required={!isLogin}
                  className="input-premium !pl-14 text-xs font-bold uppercase tracking-widest"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                type="email"
                name="email"
                placeholder="ADRESSE E-MAIL"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-premium !pl-14 text-xs font-bold uppercase tracking-widest"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                type="password"
                name="password"
                placeholder="MOT DE PASSE"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-premium !pl-14 text-xs font-bold uppercase tracking-widest"
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                 ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="neon-button w-full h-14 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Commencer l\'écoute' : 'Créer mon univers'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.3em]">
           Podcastic High-Fidelity Audio © 2026
        </p>
      </div>
    </div>
  );
}
