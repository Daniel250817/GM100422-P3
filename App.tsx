import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationProvider, useNavigation, Screen } from './src/context/NavigationContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AuthScreen from './src/screens/auth/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import StartWorkScreen from './src/screens/StartWorkScreen';
import ScheduleManagementScreen from './src/screens/ScheduleManagementScreen';
import RoutineManagementScreen from './src/screens/RoutineManagementScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import HelpScreen from './src/screens/HelpScreen';
import SupabaseAuthService from './src/services/SupabaseAuthService';
import ToastService from './src/services/ToastService';
import ConfirmationModal from './src/components/ui/ConfirmationModal';

function AppContent() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { currentScreen, canGoBack, navigateTo, goBack, resetNavigation } = useNavigation();
  const [showAuth, setShowAuth] = useState(!isAuthenticated);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [needsOTPVerification, setNeedsOTPVerification] = useState(false);
  useEffect(() => {
    console.log('🔄 Auth state changed:', { isAuthenticated, showAuth, isLoginInProgress, needsOTPVerification });
    
    // Reset login progress when user is not authenticated
    if (!isAuthenticated && (isLoginInProgress || needsOTPVerification)) {
      console.log('🔄 Reseteando estados de login porque usuario no está autenticado');
      setIsLoginInProgress(false);
      setNeedsOTPVerification(false);
    }
    
    // No navegar si estamos en proceso de login
    if (isLoginInProgress) {
      console.log('⏭️ Ignorando navegación (proceso de login)');
      return;
    }
    
    if (isAuthenticated && !needsOTPVerification) {
      console.log('✅ User fully authenticated, resetting navigation');
      setShowAuth(false);
      resetNavigation(); // Reset navigation when user logs in
    } else if (needsOTPVerification) {
      console.log('🔐 User needs OTP verification, showing auth screen');
      setShowAuth(true);
    } else {
      console.log('🔄 User needs authentication');
      setShowAuth(true);
    }
  }, [isAuthenticated, resetNavigation, isLoginInProgress, needsOTPVerification]);

  // Efecto específico para manejar logout
  useEffect(() => {
    console.log('🔍 Verificando estado de autenticación:', { 
      isAuthenticated, 
      isLoading, 
      showAuth,
      currentScreen 
    });
    
    if (!isAuthenticated && !isLoading) {
      console.log('🚪 Usuario no autenticado, forzando navegación a auth');
      setShowAuth(true);
      resetNavigation();
      setIsLoginInProgress(false);
      setNeedsOTPVerification(false);
    }
  }, [isAuthenticated, isLoading, resetNavigation, showAuth, currentScreen]);

  // Timeout de seguridad para detectar usuarios "atrapados" - solo después de logout
  useEffect(() => {
    // Solo activar el timeout si:
    // 1. No está autenticado
    // 2. No está cargando
    // 3. No está en pantalla de auth
    // 4. Y ha pasado suficiente tiempo desde el último cambio de estado
    if (!isAuthenticated && !isLoading && !showAuth) {
      console.log('⚠️ Usuario no autenticado pero no en pantalla de auth - posible usuario atrapado');
      
      const timeout = setTimeout(() => {
        // Verificar nuevamente antes de forzar navegación
        if (!isAuthenticated && !isLoading && !showAuth) {
          console.log('🚨 Timeout de seguridad: forzando navegación a auth');
          setShowAuth(true);
          resetNavigation();
          setIsLoginInProgress(false);
          setNeedsOTPVerification(false);
        } else {
          console.log('✅ Estado cambió durante el timeout, cancelando forzado de navegación');
        }
      }, 5000); // Aumentar a 5 segundos para ser menos agresivo

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, showAuth, resetNavigation]);
  const confirmLogout = async () => {
    try {
      setLogoutLoading(true);
      console.log('🚪 Iniciando proceso de logout...');
      
      await logout();
      
      // Forzar navegación a auth después del logout
      console.log('🔄 Forzando navegación a auth después del logout...');
      setShowAuth(true);
      resetNavigation();
      setIsLoginInProgress(false);
      setNeedsOTPVerification(false);
      
      ToastService.success('Sesión cerrada', 'Has cerrado sesión correctamente');
    } catch (error) {
      console.log('Error cerrando sesión:', error);
      ToastService.error('Error', 'No se pudo cerrar la sesión');
      
      // Aún así, forzar navegación a auth en caso de error
      setShowAuth(true);
      resetNavigation();
      setIsLoginInProgress(false);
      setNeedsOTPVerification(false);
    } finally {
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };

  // Efecto adicional para manejar cambios en showAuth
  useEffect(() => {
    console.log('🔄 ShowAuth state changed:', showAuth);
  }, [showAuth]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (showAuth) {
        // If in auth screen, show exit confirmation
        setShowLogoutModal(true);
        return true;
      } else if (canGoBack) {
        // If can go back in navigation, go back
        goBack();
        return true;
      } else {
         // If in auth screen, show exit confirmation
         setShowLogoutModal(true);
         return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showAuth, canGoBack, goBack]);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setNeedsOTPVerification(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen 
          onNavigateToStartWork={() => navigateTo('startWork')}
          onNavigateToScheduleManagement={() => navigateTo('scheduleManagement')}
          onNavigateToRoutineManagement={() => navigateTo('routineManagement')}
          onNavigateToProfile={() => navigateTo('profile')}
          onNavigateToSettings={() => navigateTo('settings')}
          onNavigateToStatistics={() => navigateTo('statistics')}
          onNavigateToHelp={() => navigateTo('help')}
        />;
      case 'startWork':
        return <StartWorkScreen onNavigateBack={() => goBack()} />;
      case 'scheduleManagement':
        return <ScheduleManagementScreen onNavigateBack={() => goBack()} />;
      case 'routineManagement':
        return <RoutineManagementScreen onNavigateBack={() => goBack()} />;
      case 'profile':
        return <ProfileScreen onNavigateBack={() => goBack()} />;
      case 'settings':
        return <SettingsScreen onNavigateBack={() => goBack()} />;
      case 'statistics':
        return <StatisticsScreen onNavigateBack={() => goBack()} />;
      case 'help':
        return <HelpScreen onNavigateBack={() => goBack()} />;
      default:
        return <HomeScreen 
          onNavigateToStartWork={() => navigateTo('startWork')}
          onNavigateToScheduleManagement={() => navigateTo('scheduleManagement')}
          onNavigateToRoutineManagement={() => navigateTo('routineManagement')}
          onNavigateToProfile={() => navigateTo('profile')}
          onNavigateToSettings={() => navigateTo('settings')}
          onNavigateToStatistics={() => navigateTo('statistics')}
          onNavigateToHelp={() => navigateTo('help')}
        />;
    }
  };

  return (
    <View style={styles.container}>
      {showAuth || needsOTPVerification ? (
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess} 
          onLoginProgressChange={setIsLoginInProgress}
          onNeedsOTPVerification={setNeedsOTPVerification}
        />
      ) : (
        renderScreen()
      )}
      <StatusBar style="light" />
      <Toast 
        config={{
          success: (props) => (
            <View style={{
              backgroundColor: '#4CAF50',
              alignSelf: 'center',
              width: '92%',
              maxWidth: 600,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}>
              {!!props.text1 && (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{ color: 'white', fontWeight: '700', fontSize: 14 }}
                >
                  {props.text1}
                </Text>
              )}
              {!!props.text2 && (
                <Text
                  numberOfLines={3}
                  ellipsizeMode="tail"
                  style={{ color: 'white', opacity: 0.9, marginTop: 4, lineHeight: 18, fontSize: 13 }}
                >
                  {props.text2}
                </Text>
              )}
            </View>
          ),
          error: (props) => (
            <View style={{
              backgroundColor: '#F44336',
              alignSelf: 'center',
              width: '92%',
              maxWidth: 600,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}>
              {!!props.text1 && (
                <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                  {props.text1}
                </Text>
              )}
              {!!props.text2 && (
                <Text numberOfLines={3} ellipsizeMode="tail" style={{ color: 'white', opacity: 0.9, marginTop: 4, lineHeight: 18, fontSize: 13 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
          info: (props) => (
            <View style={{
              backgroundColor: '#2196F3',
              alignSelf: 'center',
              width: '92%',
              maxWidth: 600,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}>
              {!!props.text1 && (
                <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                  {props.text1}
                </Text>
              )}
              {!!props.text2 && (
                <Text numberOfLines={3} ellipsizeMode="tail" style={{ color: 'white', opacity: 0.9, marginTop: 4, lineHeight: 18, fontSize: 13 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
          warning: (props) => (
            <View style={{
              backgroundColor: '#FFD700',
              alignSelf: 'center',
              width: '92%',
              maxWidth: 600,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}>
              {!!props.text1 && (
                <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>
                  {props.text1}
                </Text>
              )}
              {!!props.text2 && (
                <Text numberOfLines={3} ellipsizeMode="tail" style={{ color: '#000', opacity: 0.9, marginTop: 4, lineHeight: 18, fontSize: 13 }}>
                  {props.text2}
                </Text>
              )}
            </View>
          ),
        }}
      />
      <ConfirmationModal
        visible={showLogoutModal}
        title="Cerrar Sesión"
        message="¿Estás seguro de que quieres cerrar sesión? Tendrás que volver a iniciar sesión para acceder a tu cuenta."
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        confirmColor="#FF3B30"
        icon="log-out-outline"
        loading={logoutLoading}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
