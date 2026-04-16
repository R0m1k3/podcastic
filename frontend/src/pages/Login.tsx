import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

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
    <div className="min-h-screen bg-gradient-light flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-4xl mx-auto mb-4">
            🎙️
          </div>
          <h1 className="text-4xl font-bold text-light-900 mb-2">Podcastic</h1>
          <p className="text-light-600">Votre compagnon de streaming de podcasts</p>
        </div>

        {/* Form Card */}
        <div className="card mb-6">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setFormData({ email: '', password: '', username: '' });
              }}
              className="w-full mb-4"
            >
              <div className="flex gap-2">
                <button
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    isLogin
                      ? 'bg-blue-500 text-white'
                      : 'bg-light-100 text-light-700 hover:bg-light-200'
                  }`}
                  onClick={() => setIsLogin(true)}
                >
                  Se connecter
                </button>
                <button
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    !isLogin
                      ? 'bg-blue-500 text-white'
                      : 'bg-light-100 text-light-700 hover:bg-light-200'
                  }`}
                  onClick={() => setIsLogin(false)}
                >
                  Créer un compte
                </button>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="username"
                placeholder="Nom d'utilisateur"
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
                className="input"
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Adresse e-mail"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
            />

            <input
              type="password"
              name="password"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={handleChange}
              required
              className="input"
            />

            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner border-white"></div>
                  {isLogin ? 'Connexion en cours...' : 'Création du compte...'}
                </div>
              ) : isLogin ? (
                'Se connecter'
              ) : (
                'Créer un compte'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-light-600">
          {isLogin
            ? "Pas de compte ? Cliquez sur Créer un compte ci-dessus"
            : 'Déjà un compte ? Cliquez sur Se connecter ci-dessus'}
        </p>
      </div>
    </div>
  );
}
