import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Share,
  TextInput,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SupabaseTOTPService, { TOTPConfig } from '../services/SupabaseTOTPService';
import * as Clipboard from 'expo-clipboard';

interface TOTPSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSetupComplete: (config: TOTPConfig) => void;
  userEmail: string;
}

export default function TOTPSetupModal({ 
  visible, 
  onClose, 
  onSetupComplete, 
  userEmail 
}: TOTPSetupModalProps) {
  const { theme } = useTheme();
  const [totpConfig, setTotpConfig] = useState<TOTPConfig | null>(null);
  const [testCode, setTestCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (visible && !totpConfig) {
      generateTOTPConfig();
    }
  }, [visible]);

  const generateTOTPConfig = async () => {
    try {
      console.log('🔧 Verificando configuración TOTP existente...');
      
      // Primero verificar si ya existe un factor TOTP
      const existingResult = await SupabaseTOTPService.getExistingTOTPConfig(userEmail);
      
      if (existingResult.success && existingResult.config) {
        console.log('✅ Factor TOTP existente encontrado:', {
          hasSecret: !!existingResult.config.secret,
          hasQR: !!existingResult.config.qrCodeUrl,
          secretLength: existingResult.config.secret?.length || 0
        });
        setTotpConfig(existingResult.config);
        // No mostrar alert, simplemente usar la configuración existente
      } else {
        console.log('🆕 No existe factor TOTP, creando uno nuevo...');
        await createNewTOTPFactor();
      }
    } catch (error) {
      console.log('Error generating TOTP config:', error);
      Alert.alert('Error', 'No se pudo generar la configuración TOTP');
    }
  };

  const createNewTOTPFactor = async () => {
    try {
      console.log('🆕 Creando nuevo factor TOTP...');
      
      // Primero eliminar el factor existente si existe
      const factorsResult = await SupabaseTOTPService.getFactors();
      if (factorsResult.success && factorsResult.factors && factorsResult.factors.length > 0) {
        console.log('🗑️ Eliminando factor TOTP existente...');
        for (const factor of factorsResult.factors) {
          await SupabaseTOTPService.unenrollTOTP(factor.id);
        }
      }
      
      // Crear un nuevo factor TOTP
      const result = await SupabaseTOTPService.enrollTOTP(userEmail);
      
      if (result.success && result.config) {
        console.log('✅ Nuevo factor TOTP creado en Supabase:', {
          hasSecret: !!result.config.secret,
          hasQR: !!result.config.qrCodeUrl,
          secretLength: result.config.secret?.length || 0
        });
        setTotpConfig(result.config);
      } else {
        console.log('❌ Error creando factor TOTP:', result.error);
        Alert.alert('Error', result.error || 'No se pudo generar la configuración TOTP');
      }
    } catch (error) {
      console.log('Error creating new TOTP factor:', error);
      Alert.alert('Error', 'No se pudo crear el nuevo factor TOTP');
    }
  };

  const copySecret = async () => {
    if (totpConfig) {
      try {
        await Clipboard.setStringAsync(totpConfig.secret);
        Alert.alert('Copiado', 'Secreto copiado al portapapeles');
      } catch (error) {
        Alert.alert('Error', 'No se pudo copiar el secreto');
      }
    }
  };


  const shareConfig = async () => {
    if (totpConfig) {
      try {
        await Share.share({
          message: `Configuración TOTP para ${totpConfig.account}:\n\nSecreto: ${totpConfig.secret}\n\nURL: ${totpConfig.qrCodeUrl}`,
          title: 'Configuración TOTP - TimeTrack'
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const validateTestCode = async () => {
    if (!totpConfig || !testCode.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de 6 dígitos');
      return;
    }

    if (testCode.length !== 6 || !/^\d{6}$/.test(testCode)) {
      Alert.alert('Error', 'El código debe tener exactamente 6 dígitos');
      return;
    }

    setIsValidating(true);
    try {
      console.log('🔐 Validando código TOTP con Supabase...');
      
      // Verificar el código con Supabase usando el factorId
      if (totpConfig.factorId) {
        const result = await SupabaseTOTPService.verifyTOTP(totpConfig.factorId, testCode);
        
        if (result.success) {
          console.log('✅ Código TOTP verificado correctamente');
          Alert.alert(
            '¡Configuración Completada!', 
            'Has configurado TOTP correctamente. El factor está activo en Supabase.',
            [
              {
                text: 'Continuar',
                onPress: () => {
                  onSetupComplete(totpConfig);
                  onClose();
                }
              }
            ]
          );
        } else {
          console.log('❌ Código TOTP inválido:', result.error);
          Alert.alert('Error', 'Código incorrecto. Verifica que hayas ingresado el código correcto de tu app de autenticación.');
        }
      } else {
        Alert.alert('Error', 'No se pudo verificar el código. Configuración incompleta.');
      }
    } catch (error) {
      console.log('Error validating TOTP:', error);
      Alert.alert('Error', 'No se pudo validar el código. Intenta de nuevo.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRenewSecret = async () => {
    try {
      console.log('🔄 Usuario solicitó renovar secreto TOTP...');
      
      // Mostrar confirmación
      Alert.alert(
        'Renovar Secreto TOTP',
        '¿Estás seguro de que quieres renovar el secreto TOTP? Esto eliminará la configuración actual y creará una nueva. Tendrás que reconfigurar tu app de autenticación.',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Renovar',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔄 Renovando secreto TOTP...');
                const result = await SupabaseTOTPService.renewTOTPSecret(userEmail);
                
                if (result.success && result.config) {
                  console.log('✅ Secreto renovado exitosamente:', {
                    hasSecret: !!result.config.secret,
                    hasQR: !!result.config.qrCodeUrl,
                    secretLength: result.config.secret?.length || 0
                  });
                  setTotpConfig(result.config);
                  setTestCode('');
                  Alert.alert('Secreto Renovado', 'El secreto TOTP ha sido renovado. Configura tu app de autenticación con el nuevo código QR.');
                } else {
                  console.log('❌ Error renovando secreto:', result.error);
                  Alert.alert('Error', result.error || 'No se pudo renovar el secreto TOTP');
                }
              } catch (error) {
                console.log('❌ Error renovando secreto:', error);
                Alert.alert('Error', 'No se pudo renovar el secreto TOTP');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.log('❌ Error en handleRenewSecret:', error);
      Alert.alert('Error', 'No se pudo renovar el secreto TOTP');
    }
  };

  const handleClose = () => {
    console.log('🚪 Cerrando TOTPSetupModal...');
    setTotpConfig(null);
    setTestCode('');
    onClose();
  };

  if (!visible || !totpConfig) {
    console.log('🚫 TOTPSetupModal no visible o sin configuración:', { visible, hasConfig: !!totpConfig });
    return null;
  }

  console.log('✅ TOTPSetupModal renderizando con configuración:', { 
    hasSecret: !!totpConfig.secret, 
    hasQR: !!totpConfig.qrCodeUrl,
    secretLength: totpConfig.secret?.length || 0,
    qrCodeLength: totpConfig.qrCodeUrl?.length || 0
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Configurar TOTP
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instrucciones */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              Paso 1: Escanea el código QR
            </Text>
            <Text style={[styles.instruction, { color: theme.colors.primary }]}>
              Abre tu aplicación de autenticación (Google Authenticator, Authy, etc.) y escanea este código QR:
            </Text>
          </View>

          {/* QR Code */}
          <View style={[styles.qrContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {totpConfig.qrCodeUrl && totpConfig.qrCodeUrl.length < 2000 ? (
              <QRCode
                value={totpConfig.qrCodeUrl}
                size={180}
                color={theme.isDark ? '#000000' : '#000000'}
                backgroundColor={theme.isDark ? '#FFFFFF' : '#FFFFFF'}
                logoSize={0}
                logoMargin={0}
                logoBackgroundColor="transparent"
                quietZone={10}
              />
            ) : (
              <View style={styles.qrErrorContainer}>
                <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
                <Text style={[styles.qrErrorText, { color: theme.colors.text }]}>
                  QR Code demasiado grande
                </Text>
                <Text style={[styles.qrErrorSubtext, { color: theme.colors.textSecondary }]}>
                  Usa el secreto manual
                </Text>
              </View>
            )}
          </View>

          {/* Secreto manual */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              Paso 2: Configuración manual (alternativa)
            </Text>
            <Text style={[styles.instruction, { color: theme.colors.primary }]}>
              Si no puedes escanear el QR, puedes configurar manualmente usando este secreto:
            </Text>
            
            <View style={[styles.secretContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.secretLabel, { color: theme.colors.primary }]}>
                Secreto TOTP:
              </Text>
              <Text style={[styles.secretText, { color: theme.colors.primary }]}>
                {totpConfig.secret}
              </Text>
              <View style={styles.secretButtons}>
                <TouchableOpacity style={styles.copyButton} onPress={copySecret}>
                  <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.copyButtonText, { color: theme.colors.primary }]}>
                    Copiar Secreto
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.renewButton, { borderColor: '#FF6B6B' }]} 
                  onPress={handleRenewSecret}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FF6B6B" />
                  <Text style={[styles.renewButtonText, { color: '#FF6B6B' }]}>
                    Renovar Secreto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Información adicional */}
          <View style={[styles.infoSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.infoTitle, { color: theme.colors.primary }]}>
              Información:
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              <Text style={styles.infoLabel}>Emisor:</Text> {totpConfig.issuer}
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              <Text style={styles.infoLabel}>Cuenta:</Text> {totpConfig.account}
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              <Text style={styles.infoLabel}>Dígitos:</Text> 6
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              <Text style={styles.infoLabel}>Período:</Text> 30 segundos
            </Text>
          </View>

          {/* Validación */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              Paso 3: Verificar configuración
            </Text>
            <Text style={[styles.instruction, { color: theme.colors.primary }]}>
              Ingresa el código de 6 dígitos que aparece en tu aplicación de autenticación:
            </Text>
            
            <View style={styles.testContainer}>
              <Text style={[styles.testLabel, { color: theme.colors.primary }]}>
                Código de verificación:
              </Text>
              
              {/* OTP Input similar a OTPVerificationScreen */}
              <View style={styles.otpContainer}>
                <View style={styles.otpInputs}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        if (ref) inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpInput,
                        { 
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text
                        },
                        testCode[index] ? styles.otpInputFilled : null,
                      ]}
                      value={testCode[index] || ''}
                      onChangeText={(value) => {
                        const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 1);
                        const newCode = testCode.split('');
                        newCode[index] = sanitizedValue;
                        setTestCode(newCode.join(''));
                        
                        // Auto-focus next input si se ingresó un dígito
                        if (sanitizedValue && index < 5) {
                          inputRefs.current[index + 1]?.focus();
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !testCode[index] && index > 0) {
                          inputRefs.current[index - 1]?.focus();
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.validateButton,
                  { backgroundColor: theme.colors.primary },
                  isValidating && styles.validateButtonDisabled
                ]}
                onPress={validateTestCode}
                disabled={isValidating || testCode.length !== 6}
              >
                <Text style={[styles.validateButtonText, { color: theme.isDark ? '#000' : '#FFF' }]}>
                  {isValidating ? 'Verificando...' : 'Verificar Código'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, { borderColor: theme.colors.primary }]} onPress={shareConfig}>
              <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
                Compartir
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  qrErrorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrErrorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  qrErrorSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  secretContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  secretLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  secretText: {
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  secretButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  renewButtonText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  infoSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '600',
  },
  testContainer: {
    marginTop: 12,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
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
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  otpInputFilled: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD700',
    color: '#000000',
  },
  validateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
