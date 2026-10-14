import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown, Sparkles } from 'lucide-react';
import { AppTheme } from '../types/order';
import { APP_THEMES, applyTheme } from '../utils/theme';

interface ThemeSwitcherProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeThemeConfig = APP_THEMES.find((t) => t.id === currentTheme) || APP_THEMES[0];

  const handleSelect = (themeId: AppTheme) => {
    applyTheme(themeId);
    onThemeChange(themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 transition-colors text-xs text-neutral-200"
        title="Change App Theme"
      >
        <span
          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: activeThemeConfig.previewColors.accent }}
        />
        {!compact && (
          <span className="font-medium hidden sm:inline-block">
            {activeThemeConfig.name}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 p-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 mb-1.5 border-b border-neutral-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Plant Floor Color Themes</span>
            </span>
          </div>

          <div className="space-y-1">
            {APP_THEMES.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-neutral-800 text-white font-semibold ring-1 ring-amber-400/50'
                      : 'hover:bg-neutral-800/60 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Color Swatch Dot Trio */}
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-neutral-800 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.card }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-neutral-800 shadow-sm"
                        style={{ backgroundColor: theme.previewColors.accent }}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-neutral-100 flex items-center gap-1.5">
                        <span>{theme.name}</span>
                        {theme.id === 'kraft' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                            Default
                          </span>
                        )}
                        {theme.id === 'light' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-800">
                            Daylight
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 leading-tight">
                        {theme.tagline}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
