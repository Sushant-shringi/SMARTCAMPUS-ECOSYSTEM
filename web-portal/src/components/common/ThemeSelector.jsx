import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Check, Sparkles, Moon, Sun, Layers, Droplets } from 'lucide-react';

const THEME_ICONS = {
  'university-blue': Sun,
  'midnight-dark': Moon,
  'lavender-ai': Sparkles,
  'glass-blue': Droplets,
  'career-gradient': Layers,
};

export const ThemeSelector = ({ variant = 'dropdown', className = '' }) => {
  const { theme, setTheme, themes, currentThemeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation support
  const handleKeyDown = (e, themeId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setTheme(themeId);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const CurrentIcon = THEME_ICONS[theme] || Palette;

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 ${className}`}>
        {themes.map((t) => {
          const isSelected = theme === t.id;
          const Icon = THEME_ICONS[t.id] || Palette;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              onKeyDown={(e) => handleKeyDown(e, t.id)}
              role="radio"
              aria-checked={isSelected}
              className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: t.primaryColor }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.name}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      {t.badge}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                {t.description}
              </p>

              {/* Theme color preview swatch bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Palette:</span>
                <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: t.primaryColor }} />
                <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: t.accentBg }} />
                {t.isDark ? (
                  <span className="text-[10px] text-sky-400 font-mono ml-auto">Dark</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono ml-auto">Light</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Interface Theme"
        title={`Active Theme: ${currentThemeConfig.name}`}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-semibold transition-all shadow-2xs"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentThemeConfig.primaryColor }}
        />
        <CurrentIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        <span className="hidden md:inline text-slate-800 dark:text-slate-200 font-medium">
          {currentThemeConfig.name}
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Theme Options"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              Theme System
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select your preferred visual atmosphere
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto py-1 space-y-1">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              const Icon = THEME_ICONS[t.id] || Palette;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, t.id)}
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <div>
                      <span className="text-xs font-medium block">{t.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                        {t.tagline}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
