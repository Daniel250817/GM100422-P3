import { useMemo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const useThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: ReturnType<typeof useTheme>['theme']) => T
): T => {
  const { theme } = useTheme();
  
  // Memoizar la función creadora para evitar recreaciones innecesarias
  const memoizedStyleCreator = useCallback(styleCreator, []);
  
  return useMemo(() => {
    console.log('🎨 Recalculando estilos temáticos:', { 
      isDark: theme.isDark,
      background: theme.colors.background,
      primary: theme.colors.primary 
    });
    return memoizedStyleCreator(theme);
  }, [theme.isDark, theme.colors.background, theme.colors.surface, theme.colors.primary, theme.colors.text, memoizedStyleCreator]);
};

// Hook para crear estilos comunes
export const useCommonStyles = () => {
  const { theme } = useTheme();
  
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    surface: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    text: {
      color: theme.colors.text,
    },
    textSecondary: {
      color: theme.colors.textSecondary,
    },
    primaryText: {
      color: theme.colors.primary,
    },
    border: {
      borderColor: theme.colors.border,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.isDark ? '#000' : '#FFF',
      fontWeight: 'bold',
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
    },
    header: {
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
    },
    shadow: theme.isDark ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
  }), [theme]);
};
