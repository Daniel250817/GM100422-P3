import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export const useThemeForceUpdate = () => {
  const { theme } = useTheme();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    console.log('🔄 Forzando actualización de tema:', { isDark: theme.isDark });
    setForceUpdate(prev => prev + 1);
  }, [theme.isDark, theme.colors.background, theme.colors.primary]);

  return { forceUpdate, theme };
};
