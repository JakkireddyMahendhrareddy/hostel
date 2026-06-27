import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

export type OptionKey =
  | 'reduceMotion'
  | 'highContrast'
  | 'compactMode'
  | 'hapticFeedback'
  | 'keepScreenOn';

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  fontSize: FontSize;
  fontFamily: string;
  // Additional options
  reduceMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  hapticFeedback: boolean;
  keepScreenOn: boolean;
}

const defaultTheme: ThemeSettings = {
  mode: 'light',
  primaryColor: '#4f46e5', // Indigo-600
  fontSize: 'medium',
  fontFamily: 'Inter',
  reduceMotion: false,
  highContrast: false,
  compactMode: false,
  hapticFeedback: true,
  keepScreenOn: false,
};

interface ThemeContextType {
  theme: ThemeSettings;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: string) => void;
  setOption: (key: OptionKey, value: boolean) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'hostel_theme_settings';

// Font size mapping
const fontSizeMap: Record<FontSize, number> = {
  small: 12,
  medium: 14,
  large: 16,
};

// Font family mapping
const fontFamilyMap: Record<string, string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  Roboto: "'Roboto', sans-serif",
  Poppins: "'Poppins', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  Montserrat: "'Montserrat', sans-serif",
  'System Default': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode || defaultTheme.mode,
          primaryColor: parsed.primaryColor || defaultTheme.primaryColor,
          fontSize: parsed.fontSize || defaultTheme.fontSize,
          fontFamily: parsed.fontFamily || defaultTheme.fontFamily,
          reduceMotion: parsed.reduceMotion ?? defaultTheme.reduceMotion,
          highContrast: parsed.highContrast ?? defaultTheme.highContrast,
          compactMode: parsed.compactMode ?? defaultTheme.compactMode,
          hapticFeedback: parsed.hapticFeedback ?? defaultTheme.hapticFeedback,
          keepScreenOn: parsed.keepScreenOn ?? defaultTheme.keepScreenOn,
        };
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
    }
    return defaultTheme;
  });

  // Apply theme mode to document - ensure it works globally
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove any existing theme classes first
    root.classList.remove('dark', 'light');
    if (body) {
      body.classList.remove('dark', 'light');
    }
    
    // Add the appropriate theme class
    if (theme.mode === 'dark') {
      root.classList.add('dark');
      if (body) {
        body.classList.add('dark');
      }
      
      // Also set data attribute for additional styling hooks
      root.setAttribute('data-theme', 'dark');
      if (body) {
        body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      if (body) {
        body.classList.remove('dark');
      }
      root.setAttribute('data-theme', 'light');
      if (body) {
        body.setAttribute('data-theme', 'light');
      }
    }
    
    // Update CSS variables for dark mode backgrounds
    if (theme.mode === 'dark') {
      root.style.setProperty('--content-bg', '#111827');
      root.style.setProperty('--text-color', '#f9fafb');
      root.style.setProperty('--bg-color', '#1f2937');
      root.style.setProperty('--border-color', '#374151');
      root.style.setProperty('--card-bg', '#1f2937');
      root.style.setProperty('--input-bg', '#1f2937');
    } else {
      root.style.setProperty('--content-bg', '#f9fafb');
      root.style.setProperty('--text-color', '#111827');
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--input-bg', '#ffffff');
    }
    
    // Force a repaint to ensure changes are applied
    void root.offsetHeight;
  }, [theme.mode]);

  // Apply theme settings to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Primary color - apply to header, sidebar, buttons, and highlights
    root.style.setProperty('--primary-color', theme.primaryColor);
    
    // Calculate darker shade for sidebar (80% of primary color brightness)
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(theme.primaryColor);
    if (rgb) {
      // Darker shade for sidebar (reduce brightness by 20%)
      const sidebarR = Math.max(0, Math.floor(rgb.r * 0.8));
      const sidebarG = Math.max(0, Math.floor(rgb.g * 0.8));
      const sidebarB = Math.max(0, Math.floor(rgb.b * 0.8));
      const sidebarColor = `rgb(${sidebarR}, ${sidebarG}, ${sidebarB})`;
      
      root.style.setProperty('--header-bg', theme.primaryColor);
      root.style.setProperty('--sidebar-bg', sidebarColor);
      root.style.setProperty('--primary-600', theme.primaryColor);
    }
    
    // Font size - apply globally
    const fontSizeValue = `${fontSizeMap[theme.fontSize]}px`;
    root.style.setProperty('--base-font-size', fontSizeValue);
    // Apply to body and all elements
    if (body) {
      body.style.fontSize = fontSizeValue;
    }
    
    // Font family - apply globally
    const fontFamilyValue = fontFamilyMap[theme.fontFamily] || fontFamilyMap['Inter'];
    root.style.setProperty('--font-family', fontFamilyValue);
    // Apply to body and all elements
    if (body) {
      body.style.fontFamily = fontFamilyValue;
    }
  }, [theme.primaryColor, theme.fontSize, theme.fontFamily]);

  // Apply functional accessibility/layout options as root classes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', theme.reduceMotion);
    root.classList.toggle('high-contrast', theme.highContrast);
    root.classList.toggle('compact', theme.compactMode);
  }, [theme.reduceMotion, theme.highContrast, theme.compactMode]);

  // Save to localStorage whenever theme changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [theme]);

  const setThemeMode = (mode: ThemeMode) => {
    setTheme((prev) => ({ ...prev, mode }));
  };

  const toggleTheme = () => {
    setTheme((prev) => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));
  };

  const setPrimaryColor = (color: string) => {
    setTheme((prev) => ({ ...prev, primaryColor: color }));
  };

  const setFontSize = (size: FontSize) => {
    setTheme((prev) => ({ ...prev, fontSize: size }));
  };

  const setFontFamily = (family: string) => {
    setTheme((prev) => ({ ...prev, fontFamily: family }));
  };

  const setOption = (key: OptionKey, value: boolean) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setThemeMode,
        toggleTheme,
        setPrimaryColor,
        setFontSize,
        setFontFamily,
        setOption,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
