import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import RegisterScreen from './RegisterScreen';
import LoginScreen from './LoginScreen';
import OTPVerificationScreen from './OTPVerificationScreen';
import SupabaseTOTPService from '../../services/SupabaseTOTPService';
import ToastService from '../../services/ToastService';
import { supabase } from '../../lib/supabase';

type AuthStep = 'login' | 'register' | 'otp';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onLoginProgressChange?: (inProgress: boolean) => void;
  onNeedsOTPVerification?: (needs: boolean) => void;
}

export default function AuthScreen({ onAuthSuccess, onLoginProgressChange, onNeedsOTPVerification }: AuthScreenProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [useTOTP, setUseTOTP] = useState(false);
  const [totpConfig, setTotpConfig] = useState<any>(null);
  const [isTOTPNew, setIsTOTPNew] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const { login, register, verifyOTP, resendOTP, isLoading, setAuthenticated } = useAuth();

  // Notificar cambios en el progreso del login
  useEffect(() => {
    if (onLoginProgressChange) {
      onLoginProgressChange(isLoginInProgress);
    }
  }, [isLoginInProgress, onLoginProgressChange]);

  const handleRegister = async (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  }) => {
    try {
      console.log('🔄 Iniciando registro...', userData.email);
      
      // Registrar usuario (ahora envía OTP automáticamente)
      const registerResult = await register(userData);
      console.log('📋 Resultado del registro:', registerResult);
      
      if (!registerResult.success) {
        console.log('❌ Registro falló:', registerResult.message);
        ToastService.error('Error de registro', registerResult.message || 'No se pudo registrar el usuario');
        return;
      }

      console.log('✅ Registro exitoso, navegando a OTP...');
      setUserEmail(userData.email);
      setCurrentStep('otp');
      
      ToastService.success(
        'Registro Exitoso',
        'Te hemos enviado un código de verificación de 6 dígitos a tu email'
      );
    } catch (error: any) {
      console.log('❌ Error en registro:', error);
      ToastService.error('Error inesperado', error.message || 'No se pudo registrar el usuario');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('🔄 Verificando credenciales...', email);
      
      setIsLoginInProgress(true);
      setUserEmail(email);
      setUserPassword(password);
      
      // SOLO verificar credenciales
      const result = await login(email, password);
      console.log('📋 Resultado de verificación:', result);
      
      if (result.success) {
        // Credenciales correctas
        console.log('✅ Credenciales correctas');
        
        // Verificar si el usuario tiene two_factor_enabled habilitado
        if (result.twoFactorEnabled === true) {
          // Si tiene 2FA habilitado → ir a OTP
          console.log('🔐 Usuario tiene 2FA habilitado, navegando a OTP...');
          setCurrentStep('otp');
          setIsLoginInProgress(false);
          // Establecer que necesita verificación OTP
          if (onNeedsOTPVerification) {
            onNeedsOTPVerification(true);
          }
          // Enviar OTP automáticamente
          console.log('📧 Enviando OTP automáticamente...');
          try {
            const otpResult = await resendOTP(email);
            if (otpResult.success) {
              ToastService.success('Credenciales correctas', 'Código OTP enviado a tu email');
            } else {
              // Manejar rate limiting específicamente
              if (otpResult.message?.includes('rate limit') || otpResult.message?.includes('exceeded')) {
                // Rate limit alcanzado, mostrar opción TOTP
                console.log('🔄 Rate limit alcanzado, mostrando opción TOTP...');
                ToastService.warning(
                  'Rate Limit Alcanzado',
                  'Rate limit alcanzado. Puedes usar TOTP si lo tienes configurado.'
                );
                // No activar TOTP automáticamente, dejar que el usuario lo active manualmente
              } else if (otpResult.message?.includes('8 seconds')) {
                ToastService.warning('Credenciales correctas', 'Debes esperar 8 segundos antes de solicitar otro código');
              } else {
                ToastService.warning('Credenciales correctas', 'Verifica tu código OTP (envío falló)');
              }
            }
          } catch (otpError: any) {
            console.log('❌ Error enviando OTP:', otpError);
            if (otpError.message?.includes('rate limit') || otpError.message?.includes('exceeded')) {
              // Rate limit alcanzado, mostrar opción TOTP
              console.log('🔄 Rate limit alcanzado, mostrando opción TOTP...');
              ToastService.warning(
                'Rate Limit Alcanzado',
                'Rate limit alcanzado. Puedes usar TOTP si lo tienes configurado.'
              );
              // No activar TOTP automáticamente, dejar que el usuario lo active manualmente
            } else {
              ToastService.warning('Credenciales correctas', 'Verifica tu código OTP (envío falló)');
            }
          }
        } else {
          // Si no tiene 2FA habilitado → ir directamente al home
          console.log('🚀 Usuario sin 2FA, autenticando directamente...');
          setAuthenticated(true);
          setIsLoginInProgress(false);
          onAuthSuccess();
          ToastService.success('¡Bienvenido!', 'Has iniciado sesión exitosamente');
        }
      } else {
        // Credenciales incorrectas → quedarse en login
        console.log('❌ Credenciales incorrectas');
        setIsLoginInProgress(false);
        ToastService.error('Error al entrar', 'Credenciales incorrectas');
      }
    } catch (error: any) {
      setIsLoginInProgress(false);
      ToastService.error('Error de login', 'No se pudo verificar las credenciales');
    }
  };

  const handleVerifyOTP = async (code: string) => {
    try {
      if (useTOTP && totpConfig?.factorId) {
        // Verificar código TOTP usando Supabase
        const result = await SupabaseTOTPService.verifyTOTP(totpConfig.factorId, code);
        if (result.success) {
          console.log('✅ TOTP verificado exitosamente, estableciendo autenticación');
          setAuthenticated(true);
          ToastService.success('¡Bienvenido!', 'Has iniciado sesión exitosamente con TOTP');
          onAuthSuccess();
        } else {
          // TOTP incorrecto - lanzar error para que el componente maneje los intentos
          throw new Error(result.error || 'Código TOTP incorrecto');
        }
      } else {
        // Verificar código OTP por email
        const result = await verifyOTP(userEmail, code, userPassword);
        if (result.success) {
          console.log('✅ OTP verificado exitosamente, estableciendo autenticación');
          setAuthenticated(true);
          ToastService.success('¡Bienvenido!', 'Has iniciado sesión exitosamente');
          onAuthSuccess();
        } else {
          // OTP incorrecto - lanzar error para que el componente maneje los intentos
          throw new Error('Código OTP incorrecto');
        }
      }
    } catch (error: any) {
      console.log('Error verificando OTP:', error);
      throw error; // Re-lanzar el error para que el componente lo maneje
    }
  };

  const handleResendOTP = async () => {
    try {
      if (useTOTP && totpConfig) {
        // TOTP ya está activo, no mostrar código
        ToastService.info(
          'TOTP Activo',
          'Usa TOTP como alternativa (código cambia cada 30 segundos)'
        );
      } else {
        // Reenviar OTP por email
        const result = await resendOTP(userEmail);
        if (result.success) {
          ToastService.success(
            'Código Reenviado',
            'Te hemos enviado un nuevo código de verificación de 6 dígitos'
          );
        } else {
          ToastService.error('Error', result.message || 'No se pudo reenviar el código');
        }
      }
    } catch (error: any) {
      ToastService.error('Error', error.message || 'No se pudo reenviar el código');
    }
  };

  const handleSwitchToTOTP = async () => {
    try {
      console.log('🔍 Intentando activar TOTP...');
      
      // Primero verificar si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No hay sesión activa');
        ToastService.warning(
          'TOTP No Disponible',
          'Debes estar autenticado para usar TOTP. Usa verificación por email.'
        );
        setUseTOTP(false);
        return;
      }

      console.log('✅ Sesión activa encontrada, obteniendo configuración TOTP...');
      
      // Obtener la configuración existente
      const result = await SupabaseTOTPService.getExistingTOTPConfig(userEmail);
      
      if (result.success && result.config) {
        console.log('✅ Configuración TOTP encontrada:', result.config);
        setTotpConfig(result.config);
        setUseTOTP(true);
        setIsTOTPNew(false);
        ToastService.success(
          'TOTP Activado',
          'Usa TOTP como alternativa (código cambia cada 30 segundos)'
        );
      } else {
        console.log('❌ No se encontró configuración TOTP:', result.error);
        ToastService.warning(
          'TOTP No Configurado',
          'No tienes TOTP configurado. Configúralo primero en Ajustes.'
        );
        setUseTOTP(false);
        setIsTOTPNew(false);
      }
    } catch (error) {
      console.log('Error obteniendo configuración TOTP:', error);
      ToastService.error('Error', 'No se pudo obtener la configuración TOTP');
      setUseTOTP(false);
      setIsTOTPNew(false);
    }
  };

  const handleSwitchToEmail = () => {
    setUseTOTP(false);
    setTotpConfig(null);
    setIsTOTPNew(false);
    ToastService.info('Cambiado a Email', 'Ahora usarás verificación por email');
  };

  const handleGoBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('login');
    } else if (currentStep === 'register') {
      setCurrentStep('login');
    }
  };

  // Función para manejar cuando se agoten los intentos en OTP
  const handleOTPFailed = () => {
    console.log('❌ OTP falló - regresando a login');
    setCurrentStep('login');
    ToastService.warning('Demasiados intentos', 'Has agotado los 3 intentos. Regresa al login.');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // En las pantallas de auth, el refresh puede limpiar el estado
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderCurrentStep = () => {
    console.log('🔄 Renderizando paso actual:', currentStep);
    switch (currentStep) {
      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateToRegister={() => setCurrentStep('register')}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onRegister={handleRegister}
            onNavigateToLogin={() => setCurrentStep('login')}
          />
        );
      case 'otp':
        return (
          <OTPVerificationScreen
            email={userEmail}
            onVerifyOTP={handleVerifyOTP}
            onResendOTP={handleResendOTP}
            onGoBack={handleGoBack}
            onOTPFailed={handleOTPFailed}
            isLoading={isLoading}
            useTOTP={useTOTP}
            onSwitchToTOTP={handleSwitchToTOTP}
            onSwitchToEmail={handleSwitchToEmail}
            totpConfig={totpConfig}
            isTOTPNew={isTOTPNew}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFD700"
          colors={["#FFD700"]}
        />
      }
    >
      {renderCurrentStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
