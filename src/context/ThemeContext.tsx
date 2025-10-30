import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from '../hooks/useSettings';

export interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings, toggleDarkMode } = useSettings();
  const [isDark, setIsDark] = useState(settings?.dark_mode ?? true);

  // Sincronizar con las configuraciones de la base de datos
  useEffect(() => {
    if (settings) {
      console.log('🔄 Sincronizando tema con configuraciones:', { 
        currentTheme: isDark, 
        settingsTheme: settings.dark_mode 
      });
      setIsDark(settings.dark_mode);
    }
  }, [settings?.dark_mode]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    console.log('🔄 Cambiando tema:', { from: isDark, to: newTheme });
    setIsDark(newTheme);
    // No llamar toggleDarkMode aquí para evitar loops
  };

  const setTheme = (dark: boolean) => {
    console.log('🎨 Estableciendo tema:', { isDark: dark });
    setIsDark(dark);
  };

  const darkTheme: Theme = {
    isDark: true,
    colors: {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#FFD700',
      secondary: '#FFA500',
      text: '#FFD700',
      textSecondary: '#FFD700',
      border: '#333333',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FFD700',
      info: '#2196F3',
    },
  };

  const lightTheme: Theme = {
    isDark: false,
    colors: {
      background: '#F5F5F5',
      surface: '#FFFFFF',
      primary: '#007AFF',
      secondary: '#FFA500',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FFA500',
      info: '#2196F3',
    },
  };

  const theme = isDark ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
