import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, BackHandler, Alert } from 'react-native';
import { AuthProvider as SupabaseAuthProvider, useAuth as useSupabaseAuth } from './src/context/SupabaseAuthContext';
import { NavigationProvider, useNavigation, Screen } from './src/context/NavigationContext';
import SimpleSupabaseAuth from './src/components/SimpleSupabaseAuth';
import HomeScreen from './src/screens/HomeScreen';
import StartWorkScreen from './src/screens/StartWorkScreen';
import ScheduleManagementScreen from './src/screens/ScheduleManagementScreen';
import RoutineManagementScreen from './src/screens/RoutineManagementScreen';

function AppContent() {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const { currentScreen, canGoBack, navigateTo, goBack, resetNavigation } = useNavigation();
  const [showAuth, setShowAuth] = useState(!isAuthenticated);

  useEffect(() => {
    setShowAuth(!isAuthenticated);
    if (isAuthenticated) {
      resetNavigation(); // Reset navigation when user logs in
    }
  }, [isAuthenticated, resetNavigation]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (canGoBack) {
        goBack();
        return true;
      } else {
        Alert.alert(
          'Salir',
          '¿Estás seguro de que quieres salir de la aplicación?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack, goBack]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (showAuth || !isAuthenticated) {
    return <SimpleSupabaseAuth />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen 
          onNavigateToStartWork={() => navigateTo('startWork')}
          onNavigateToScheduleManagement={() => navigateTo('scheduleManagement')}
          onNavigateToRoutineManagement={() => navigateTo('routineManagement')}
        />;
      case 'startWork':
        return <StartWorkScreen onNavigateBack={() => goBack()} />;
      case 'scheduleManagement':
        return <ScheduleManagementScreen onNavigateBack={() => goBack()} />;
      case 'routineManagement':
        return <RoutineManagementScreen onNavigateBack={() => goBack()} />;
      default:
        return <HomeScreen 
          onNavigateToStartWork={() => navigateTo('startWork')}
          onNavigateToScheduleManagement={() => navigateTo('scheduleManagement')}
          onNavigateToRoutineManagement={() => navigateTo('routineManagement')}
        />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" />
      {renderScreen()}
    </View>
  );
}

export default function App() {
  return (
    <SupabaseAuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </SupabaseAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
