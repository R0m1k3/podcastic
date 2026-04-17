import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import './styles/globals.css';
import { authService } from './services/authService';
import { AudioProvider, useAudio } from './context/AudioContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trending from './pages/Trending';
import AddPodcast from './pages/AddPodcast';
import Library from './pages/Library';
import Navigation from './components/Navigation';
import AudioPlayer from './components/AudioPlayer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    },
  },
});

// App Content Wrapper to access AudioContext
function AppContent() {
  const { currentEpisode, closePlayer } = useAudio();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { accessToken } = authService.getTokens();
    if (!accessToken) return;
    authService.getMe().then(r => setUser(r.user)).catch(() => {});
  }, [currentEpisode]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trending"
          element={
            <ProtectedRoute>
              <Trending />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <AddPodcast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {currentEpisode && !isDashboard && (
        <AudioPlayer
          episode={currentEpisode}
          onClose={closePlayer}
          userId={user?._id}
        />
      )}
    </>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = authService.getTokens();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 min-w-0 w-full lg:ml-80 pb-40 pt-8 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <div className="reveal max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AudioProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AudioProvider>
    </QueryClientProvider>
  );
}
