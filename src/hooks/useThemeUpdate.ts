import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from './useSettings';

export const useThemeUpdate = () => {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();

  useEffect(() => {
    if (settings && settings.dark_mode !== theme.isDark) {
      console.log('🔄 useThemeUpdate: Sincronizando tema:', {
        settings: settings.dark_mode,
        current: theme.isDark
      });
      setTheme(settings.dark_mode);
    }
  }, [settings?.dark_mode, theme.isDark, setTheme]);

  return { theme, settings };
};
