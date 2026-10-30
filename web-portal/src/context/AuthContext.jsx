import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smartattend_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Consume central ThemeContext
  const { theme, toggleTheme, setTheme } = useTheme();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartattend_token');
      if (storedToken) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.warn('Session restoration failed:', err);
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    localStorage.setItem('smartattend_token', data.access_token);
    localStorage.setItem('smartattend_refresh_token', data.refresh_token);
    localStorage.setItem('smartattend_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        theme,
        toggleTheme,
        setTheme,
        login,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
