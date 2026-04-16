import { useState, useCallback } from 'react';
import { authService, User } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (email: string, password: string, username: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(email, password, username);
      setUser(response.user);
      authService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      return response.user;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      authService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      return response.user;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      authService.clearTokens();
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMe = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authService.getMe();
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      setError('Failed to fetch user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    getMe,
    isAuthenticated: !!user,
  };
};
