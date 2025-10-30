import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from './useSettings';

export const useThemeSync = () => {
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (settings && settings.dark_mode !== theme.isDark) {
      console.log('🔄 Sincronizando tema desde useThemeSync:', {
        settingsTheme: settings.dark_mode,
        currentTheme: theme.isDark
      });
      setTheme(settings.dark_mode);
      setIsSynced(true);
    }
  }, [settings?.dark_mode, theme.isDark, setTheme]);

  return { isSynced };
};
