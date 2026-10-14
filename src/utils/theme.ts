import { AppTheme } from '../types/order';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
  isDark: boolean;
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: 'kraft',
    name: 'Kraft Industrial',
    tagline: 'Cardboard Mill & Warm Amber (Factory Signature)',
    previewColors: {
      bg: '#171412',
      card: '#241f1c',
      accent: '#f59e0b',
      text: '#fafaf9',
    },
    isDark: true,
  },
  {
    id: 'slate',
    name: 'CorruTech Slate',
    tagline: 'Modern Deep Slate & Electric Indigo',
    previewColors: {
      bg: '#0b0f19',
      card: '#151d30',
      accent: '#6366f1',
      text: '#f1f5f9',
    },
    isDark: true,
  },
  {
    id: 'emerald',
    name: 'Eco-Pack Emerald',
    tagline: 'Sustainable Packaging & Forest Jade',
    previewColors: {
      bg: '#041712',
      card: '#0a261f',
      accent: '#10b981',
      text: '#ecfdf5',
    },
    isDark: true,
  },
  {
    id: 'monochrome',
    name: 'Foundry Graphite',
    tagline: 'Heavy Machine Titanium & Safety Yellow',
    previewColors: {
      bg: '#0f0f11',
      card: '#1c1c21',
      accent: '#eab308',
      text: '#f4f4f5',
    },
    isDark: true,
  },
  {
    id: 'light',
    name: 'Daylight Plant Floor',
    tagline: 'Crisp High-Visibility Light Mode for Plant Office',
    previewColors: {
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#d97706',
      text: '#0f172a',
    },
    isDark: false,
  },
];

const THEME_STORAGE_KEY = 'corrutrack_theme_v1';

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'kraft';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
    if (raw && APP_THEMES.some((t) => t.id === raw)) {
      return raw;
    }
    return 'kraft';
  } catch {
    return 'kraft';
  }
}

export function applyTheme(theme: AppTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.remove('bg-neutral-900', 'text-neutral-100');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-neutral-900', 'text-neutral-100');
    }
  } catch (err) {
    console.error('Failed to apply theme:', err);
  }
}
