import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ToastService from '../../services/ToastService';
import TOTPServiceSimple from '../../services/TOTPServiceSimple';

interface OTPVerificationScreenProps {
  email: string;
  onVerifyOTP: (code: string) => void;
  onResendOTP: () => void;
  onGoBack: () => void;
  onOTPFailed: () => void;
  isLoading?: boolean;
  useTOTP?: boolean;
  onSwitchToTOTP?: () => void;
  onSwitchToEmail?: () => void;
  totpConfig?: any; // Configuración TOTP para validación
  isTOTPNew?: boolean; // Indica si es una nueva configuración TOTP
}

export default function OTPVerificationScreen({
  email,
  onVerifyOTP,
  onResendOTP,
  onGoBack,
  onOTPFailed,
  isLoading = false,
  useTOTP = false,
  onSwitchToTOTP,
  onSwitchToEmail,
  totpConfig,
  isTOTPNew = false,
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos en segundos
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3); // Máximo 3 intentos
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    // Solo permitir dígitos
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    
    // Solo permitir un dígito por campo
    const finalValue = sanitizedValue.slice(0, 1);
    
    const newOtp = [...otp];
    newOtp[index] = finalValue;
    setOtp(newOtp);

    // Auto-focus next input si se ingresó un dígito
    if (finalValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    // Validación estricta del formato
    if (otpCode.length !== 6) {
      ToastService.error('Error', 'Por favor ingresa el código completo de 6 dígitos');
      return;
    }

    // Verificar que todos los caracteres sean dígitos
    if (!/^\d{6}$/.test(otpCode)) {
      ToastService.error('Error', 'El código debe contener solo números');
      return;
    }

    // Verificar que no haya espacios o caracteres especiales
    if (otpCode.includes(' ') || otpCode.includes('-') || otpCode.includes('.')) {
      ToastService.error('Error', 'El código no debe contener espacios, guiones o puntos');
      return;
    }

    // Verificar si se han agotado los intentos
    if (attempts >= maxAttempts) {
      ToastService.error('Demasiados intentos', 'Has agotado los 3 intentos. Regresando al login.');
      onOTPFailed();
      return;
    }

    // Incrementar intentos
    setAttempts(prev => prev + 1);
    
    // Limpiar errores previos
    setHasError(false);
    
    console.log(`🔍 Verificando código ${useTOTP ? 'TOTP' : 'OTP'}: ${otpCode} (intento ${attempts + 1}/${maxAttempts})`);
    
    try {
      // Si es TOTP, validar con Supabase
      if (useTOTP && totpConfig?.factorId) {
        console.log('🔐 Validando código TOTP con Supabase...');
        
        // La validación se hace directamente en AuthScreen con Supabase
        await onVerifyOTP(otpCode);
      } else {
        // Para OTP normal, usar la lógica existente
        await onVerifyOTP(otpCode);
      }
      
      // Si llegamos aquí, la verificación fue exitosa
      console.log('✅ Verificación exitosa');
    } catch (error) {
      console.log('❌ Error en verificación:', error);
      
      // Si hay error y se agotaron los intentos, regresar a login
      if (attempts >= maxAttempts) {
        console.log('❌ Se agotaron los intentos');
        onOTPFailed();
      } else {
        handleVerificationError();
      }
    }
  };

  // Función para manejar errores de verificación
  const handleVerificationError = () => {
    setHasError(true);
    setOtp(['', '', '', '', '', '']); // Limpiar campos
    inputRefs.current[0]?.focus(); // Volver al primer campo
    
    if (attempts >= maxAttempts) {
      ToastService.warning(
        'Demasiados intentos',
        'Has agotado los 3 intentos. Por favor, solicita un nuevo código.'
      );
      onResendOTP();
    } else {
      const remainingAttempts = maxAttempts - attempts;
      ToastService.error(
        'Código incorrecto',
        `Código incorrecto. Te quedan ${remainingAttempts} intentos.`
      );
    }
  };

  const handleResend = async () => {
    try {
      ToastService.info('Reenviando código', 'Solicitando nuevo código de verificación...');
      await onResendOTP();
    } catch (error) {
      // El error ya se maneja en el servicio
      console.log('Error en reenvío:', error);
    }
  };

  const isOTPComplete = otp.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
              <Ionicons name="arrow-back" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          {/* Contenido principal centrado */}
          <View style={styles.mainContent}>
            {/* Icono y título */}
            <View style={styles.iconContainer}>
              <Ionicons name={useTOTP ? "shield-checkmark" : "mail"} size={48} color="#FFD700" />
            </View>
            
            <Text style={styles.title}>
              {useTOTP ? "Verificación TOTP" : "Verificación de Email"}
            </Text>
            
            <Text style={styles.subtitle}>
              {useTOTP 
                ? (isTOTPNew 
                    ? "Configura TOTP en tu app de autenticación"
                    : "Ingresa el código de tu app de autenticación"
                  )
                : `Hemos enviado un código de 6 dígitos a:\n${email}`
              }
            </Text>

            {/* Mostrar QR y secreto para nueva configuración TOTP */}
            {useTOTP && isTOTPNew && totpConfig && (
              <View style={styles.totpSetupContainer}>
                <Text style={styles.totpSetupTitle}>Configuración TOTP</Text>
                
                {/* QR Code */}
                <View style={styles.qrContainer}>
                  <Text style={styles.qrLabel}>Escanea este código QR:</Text>
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrText}>QR Code</Text>
                    <Text style={styles.qrSubtext}>Usa tu app de autenticación</Text>
                  </View>
                </View>

                {/* Secreto */}
                <View style={styles.secretContainer}>
                  <Text style={styles.secretLabel}>O copia este secreto:</Text>
                  <View style={styles.secretBox}>
                    <Text style={styles.secretText} selectable>
                      {totpConfig.secret}
                    </Text>
                  </View>
                </View>

                <Text style={styles.totpInstructions}>
                  Después de configurar, ingresa el código de 6 dígitos de tu app
                </Text>
              </View>
            )}

            {/* Entrada OTP */}
            <View style={styles.otpContainer}>
              <View style={styles.otpInputs}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                      hasError ? styles.otpInputError : null,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
            </View>

            {/* Información de tiempo e intentos */}
            <View style={styles.infoContainer}>
              <Text style={styles.timerText}>
                El código expira en: {formatTime(timeLeft)}
              </Text>
              {attempts > 0 && (
                <Text style={styles.attemptsText}>
                  Intentos: {attempts}/{maxAttempts}
                </Text>
              )}
            </View>

            {/* Botón de verificación */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isOTPComplete || isLoading) && styles.verifyButtonDisabled
              ]}
              onPress={handleVerify}
              disabled={!isOTPComplete || isLoading}
            >
              <Text style={styles.verifyButtonText}>Verificar Código</Text>
            </TouchableOpacity>
          </View>

          {/* Acciones en la parte inferior */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[
                styles.resendButton,
                (!useTOTP && timeLeft > 0) && styles.resendButtonDisabled
              ]}
              onPress={handleResend}
              disabled={!useTOTP && timeLeft > 0}
            >
              <Text style={[
                styles.resendButtonText,
                (!useTOTP && timeLeft > 0) && styles.resendButtonTextDisabled
              ]}>
                {useTOTP 
                  ? 'Actualizar TOTP' 
                  : timeLeft > 0 ? `Reenviar en ${formatTime(timeLeft)}` : 'Reenviar Código'
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={useTOTP ? onSwitchToEmail : onSwitchToTOTP}
            >
              <Text style={styles.switchButtonText}>
                {useTOTP ? 'Usar Email' : 'Usar TOTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignSelf: 'flex-start',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 50,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  otpInput: {
    width: 42,
    height: 52,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#1a1a1a',
  },
  otpInputFilled: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD700',
    color: '#000000',
  },
  otpInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 4,
  },
  attemptsText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
  },
  verifyButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  bottomActions: {
    paddingBottom: 20,
    gap: 12,
  },
  resendButton: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  resendButtonDisabled: {
    borderColor: '#333',
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  resendButtonTextDisabled: {
    color: '#666',
  },
  switchButton: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  totpSetupContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  totpSetupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  qrText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  qrSubtext: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  secretContainer: {
    marginBottom: 16,
  },
  secretLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  secretBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#FFD700',
    textAlign: 'center',
  },
  totpInstructions: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});