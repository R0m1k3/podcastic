import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/globals.css';

// Placeholder pages
const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-4xl font-bold mb-4">Dashboard - Coming Soon</h1>
    <p className="text-light-600">Latest episodes will appear here</p>
  </div>
);

const Login = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-light">
    <div className="card max-w-md w-full">
      <h1 className="text-3xl font-bold mb-6">Podcastic</h1>
      <p className="text-light-600 mb-8">Sign in to start listening</p>
      <button className="btn-primary w-full mb-4">Sign In</button>
      <button className="btn-secondary w-full">Create Account</button>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
