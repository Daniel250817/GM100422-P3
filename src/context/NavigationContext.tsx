import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Screen = 'home' | 'startWork' | 'scheduleManagement' | 'routineManagement' | 'profile' | 'settings';

interface NavigationState {
  currentScreen: Screen;
  history: Screen[];
  canGoBack: boolean;
}

interface NavigationContextType {
  currentScreen: Screen;
  history: Screen[];
  canGoBack: boolean;
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  resetNavigation: () => void;
  getBreadcrumb: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: 'home',
    history: ['home'],
    canGoBack: false
  });

  const navigateTo = useCallback((screen: Screen) => {
    setNavigationState(prev => {
      const newHistory = [...prev.history, screen];
      return {
        currentScreen: screen,
        history: newHistory,
        canGoBack: newHistory.length > 1
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.history.length <= 1) {
        return prev; // No se puede retroceder más
      }
      
      const newHistory = prev.history.slice(0, -1);
      const newCurrentScreen = newHistory[newHistory.length - 1];
      
      return {
        currentScreen: newCurrentScreen,
        history: newHistory,
        canGoBack: newHistory.length > 1
      };
    });
  }, []);

  const resetNavigation = useCallback(() => {
    setNavigationState({
      currentScreen: 'home',
      history: ['home'],
      canGoBack: false
    });
  }, []);

  const getBreadcrumb = useCallback(() => {
    const screenNames = {
      'home': 'Inicio',
      'startWork': 'Jornada',
      'scheduleManagement': 'Horarios',
      'routineManagement': 'Rutinas',
      'profile': 'Perfil',
      'settings': 'Ajustes'
    };
    return navigationState.history.map(screen => screenNames[screen]).join(' → ');
  }, [navigationState.history]);

  return (
    <NavigationContext.Provider value={{
      currentScreen: navigationState.currentScreen,
      history: navigationState.history,
      canGoBack: navigationState.canGoBack,
      navigateTo,
      goBack,
      resetNavigation,
      getBreadcrumb
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
