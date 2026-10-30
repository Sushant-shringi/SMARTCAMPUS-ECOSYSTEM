import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'university-blue',
    name: 'University Blue',
    tagline: 'Default Campus Theme',
    description: 'Clean university aesthetic with pale blue surfaces and crisp white cards',
    primaryColor: '#2563eb',
    accentBg: '#eff6ff',
    badge: 'Standard',
    isDark: false,
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    tagline: 'High-Contrast Dark Mode',
    description: 'Deep navy background with dark surfaces and luminous blue accents',
    primaryColor: '#38bdf8',
    accentBg: '#1e293b',
    badge: 'Dark',
    isDark: true,
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'lavender-ai',
    name: 'Lavender AI',
    tagline: 'GenAI Studio Theme',
    description: 'Soft lavender surfaces with intelligent violet and purple highlights',
    primaryColor: '#7c3aed',
    accentBg: '#f5f3ff',
    badge: 'AI Creative',
    isDark: false,
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'glass-blue',
    name: 'Glass Blue',
    tagline: 'Modern Translucent Surface',
    description: 'Restrained frosted glass panels with clean borders and subtle depth',
    primaryColor: '#0284c7',
    accentBg: '#f0f9ff',
    badge: 'Glassmorphic',
    isDark: false,
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'career-gradient',
    name: 'Career Gradient',
    tagline: 'Modern SaaS Gradients',
    description: 'Vibrant gradient hero cards for resume, job matcher, and interview prep',
    primaryColor: '#4f46e5',
    accentBg: '#f8fafc',
    badge: 'Vibrant',
    isDark: false,
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
  },
];

const ThemeContext = createContext(null);

const STORAGE_KEY = 'smartcampus_theme';
const LEGACY_KEY = 'smartattend_theme';

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'university-blue';
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (saved === 'dark') return 'midnight-dark';
    if (saved === 'light') return 'university-blue';
    const exists = THEMES.some(t => t.id === saved);
    return exists ? saved : 'university-blue';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Coordinate with Tailwind darkMode: 'class'
    if (theme === 'midnight-dark') {
      root.classList.add('dark');
      localStorage.setItem(LEGACY_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(LEGACY_KEY, 'light');
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    if (THEMES.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    // Quick toggle between primary light (university-blue) and dark (midnight-dark)
    setThemeState(prev => (prev === 'midnight-dark' ? 'university-blue' : 'midnight-dark'));
  };

  const currentThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themes: THEMES,
        currentThemeConfig,
        isDark: theme === 'midnight-dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
