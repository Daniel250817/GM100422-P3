import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useThemeForceUpdate } from '../hooks/useThemeForceUpdate';
import { useThemeUpdate } from '../hooks/useThemeUpdate';
import { useSettings } from '../hooks/useSettings';
import ToastService from '../services/ToastService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import TOTPSetupModal from '../components/TOTPSetupModal';
import TokenDisplay from '../components/TokenDisplay';

interface SettingsScreenProps {
  onNavigateBack: () => void;
}

export default function SettingsScreen({ onNavigateBack }: SettingsScreenProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { forceUpdate } = useThemeForceUpdate();
  const { theme: updatedTheme, settings } = useThemeUpdate();
  const { 
    settings: settingsData, 
    loading, 
    saving, 
    toggleDarkMode, 
    toggleProfileImage, 
    toggleTwoFactor 
  } = useSettings();
  const savingRef = React.useRef(saving);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [totpToken, setTotpToken] = useState('');
  const [shouldReload, setShouldReload] = useState(false);

  // Función para forzar recarga completa del componente
  const forceReload = () => {
    setShouldReload(true);
    // Reset después de un momento para permitir re-mount
    setTimeout(() => {
      setShouldReload(false);
    }, 50);
  };

  // Rastrear cambios en el estado del modal TOTP
  useEffect(() => {
    console.log('🔄 Estado del modal TOTP cambió:', { showTOTPSetup });
  }, [showTOTPSetup]);

  // Forzar actualización cuando cambien las configuraciones
  useEffect(() => {
    console.log('⚙️ Configuraciones actualizadas:', { 
      darkMode: settings?.dark_mode, 
      showProfileImage: settings?.show_profile_image, 
      twoFactorEnabled: settings?.two_factor_enabled 
    });
  }, [settings]);

  // Valores por defecto mientras cargan las configuraciones
  const darkMode = settings?.dark_mode ?? true;
  const showProfileImage = settings?.show_profile_image ?? true;
  const twoFactorEnabled = settings?.two_factor_enabled ?? true;

  // Espera a que "saving" termine o hasta un timeout
  const waitUntilSavingFinishes = async (timeoutMs: number = 3000) => {
    const start = Date.now();
    while (savingRef.current) {
      if (Date.now() - start > timeoutMs) break;
      // esperar 50ms y volver a chequear
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  // Recarga completa tras ejecutar una acción async, esperando a que termine el guardado
  const reloadAfter = async (action: () => Promise<void>) => {
    await action();
    await waitUntilSavingFinishes();
    // breve respiro para que el contexto/tema se sincronicen
    await new Promise(resolve => setTimeout(resolve, 50));
    forceReload();
  };

  const handleDarkModeToggle = async (value: boolean) => {
    await reloadAfter(toggleDarkMode);
  };

  const handleProfileImageToggle = async (value: boolean) => {
    await reloadAfter(toggleProfileImage);
  };

  const handleTwoFactorToggle = async (value: boolean) => {
    if (value) {
      // Habilitar 2FA
      await reloadAfter(toggleTwoFactor);
      ToastService.info('2FA Habilitado', 'La autenticación de doble factor está activa');
    } else {
      // Mostrar modal de confirmación para deshabilitar
      setShowDisable2FAModal(true);
    }
  };

  const confirmDisable2FA = async () => {
    try {
      setDisable2FALoading(true);
      
      // Deshabilitar 2FA usando el hook
      await toggleTwoFactor();
      await waitUntilSavingFinishes();
      
      setShowDisable2FAModal(false);
      ToastService.warning('2FA Deshabilitado', 'La autenticación de doble factor ha sido desactivada');
      
      // Forzar recarga completa del componente (esperar propagación)
      await new Promise(resolve => setTimeout(resolve, 50));
      forceReload();
    } catch (error) {
      console.log('Error deshabilitando 2FA:', error);
      ToastService.error('Error', 'No se pudo deshabilitar la autenticación de doble factor');
    } finally {
      setDisable2FALoading(false);
    }
  };

  const cancelDisable2FA = () => {
    setShowDisable2FAModal(false);
  };

  const handleTOTPSetupComplete = (config: any) => {
    console.log('TOTP setup completed:', config);
    setTotpToken(config.secret);
    ToastService.success('TOTP configurado', 'La autenticación de dos factores se ha configurado correctamente');
  };

  const handleTokenChange = (token: string) => {
    setTotpToken(token);
  };

  const openTOTPSetup = () => {
    console.log('🔧 Abriendo modal de configuración TOTP...');
    setShowTOTPSetup(true);
  };

  const closeTOTPSetup = () => {
    console.log('🚪 Cerrando modal TOTP desde SettingsScreen...');
    setShowTOTPSetup(false);
  };

  const themedStyles = useThemedStyles((theme) => {
    console.log('⚙️ SettingsScreen recalculando estilos:', { isDark: theme.isDark });
    return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
      borderRadius: 12,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.text,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingText: {
      marginLeft: 12,
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
      color: theme.colors.text,
    },
    settingDescription: {
      fontSize: 14,
      opacity: 0.7,
      color: theme.colors.textSecondary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoText: {
      marginLeft: 12,
      flex: 1,
    },
    infoLabel: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 2,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.text,
    },
    // Estilos para TOTP
    totpSection: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    totpTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: theme.colors.text,
    },
    qrButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 16,
      gap: 8,
    },
    qrButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    tokenInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tokenInfoText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
  });
  });

  // Mostrar loading mientras se cargan las configuraciones
  if (loading) {
    return (
      <View style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity style={themedStyles.backButton} onPress={onNavigateBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={themedStyles.headerTitle}>
            Ajustes
          </Text>
          <View style={themedStyles.headerSpacer} />
        </View>
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={themedStyles.loadingText}>
            Cargando configuraciones...
          </Text>
        </View>
      </View>
    );
  }

  // Si debe recargar, mostrar loading y luego re-montar
  if (shouldReload) {
    return (
      <View style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity style={themedStyles.backButton} onPress={onNavigateBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={themedStyles.headerTitle}>
            Ajustes
          </Text>
          <View style={themedStyles.headerSpacer} />
        </View>
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={themedStyles.loadingText}>
            Actualizando configuraciones...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity style={themedStyles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>
          Ajustes
        </Text>
        <View style={themedStyles.headerSpacer} />
      </View>

      <ScrollView style={themedStyles.content}>
        {/* Sección de Apariencia */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>
            Apariencia
          </Text>
          
          {/* Modo Oscuro/Claro */}
          <View style={themedStyles.settingRow}>
            <View style={themedStyles.settingInfo}>
              <Ionicons 
                name={darkMode ? "moon" : "sunny"} 
                size={20} 
                color={theme.colors.primary} 
              />
              <View style={themedStyles.settingText}>
                <Text style={themedStyles.settingTitle}>
                  Modo Oscuro
                </Text>
                <Text style={themedStyles.settingDescription}>
                  {darkMode ? "Activar tema oscuro" : "Activar tema claro"}
                </Text>
              </View>
            </View>
            <Switch
              key={`dark-mode-${darkMode}`}
              value={darkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={darkMode ? theme.colors.background : theme.colors.surface}
              disabled={saving}
            />
          </View>

          {/* Mostrar Imagen de Perfil */}
          <View style={themedStyles.settingRow}>
            <View style={themedStyles.settingInfo}>
              <Ionicons 
                name={showProfileImage ? "image" : "image-outline"} 
                size={20} 
                color={theme.colors.primary} 
              />
              <View style={themedStyles.settingText}>
                <Text style={themedStyles.settingTitle}>
                  Imagen de Perfil
                </Text>
                <Text style={themedStyles.settingDescription}>
                  {showProfileImage ? "Mostrar imagen en el perfil" : "Ocultar imagen del perfil"}
                </Text>
              </View>
            </View>
            <Switch
              key={`profile-image-${showProfileImage}`}
              value={showProfileImage}
              onValueChange={handleProfileImageToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={showProfileImage ? theme.colors.background : theme.colors.surface}
              disabled={saving}
            />
          </View>
        </View>

        {/* Sección de Seguridad */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>
            Seguridad
          </Text>
          
          {/* Autenticación de Doble Factor */}
          <View style={themedStyles.settingRow}>
            <View style={themedStyles.settingInfo}>
              <Ionicons 
                name={twoFactorEnabled ? "shield-checkmark" : "shield-outline"} 
                size={20} 
                color={theme.colors.primary} 
              />
              <View style={themedStyles.settingText}>
                <Text style={themedStyles.settingTitle}>
                  Autenticación de Doble Factor
                </Text>
                <Text style={themedStyles.settingDescription}>
                  {twoFactorEnabled ? "2FA activado para mayor seguridad" : "2FA desactivado"}
                </Text>
              </View>
            </View>
            <Switch
              key={`two-factor-${twoFactorEnabled}`}
              value={twoFactorEnabled}
              onValueChange={handleTwoFactorToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={twoFactorEnabled ? theme.colors.background : theme.colors.surface}
              disabled={saving}
            />
          </View>

          {/* Configuración TOTP */}
          {twoFactorEnabled && (
            <View style={themedStyles.totpSection}>
              <Text style={themedStyles.totpTitle}>
                Configuración TOTP
              </Text>
              
              {/* Botón para configurar TOTP */}
              <TouchableOpacity 
                style={[themedStyles.qrButton, { backgroundColor: theme.colors.primary }]}
                onPress={openTOTPSetup}
              >
                <Ionicons 
                  name="qr-code-outline" 
                  size={20} 
                  color={theme.colors.background} 
                />
                <Text style={[themedStyles.qrButtonText, { color: theme.colors.background }]}>
                  Configurar TOTP
                </Text>
              </TouchableOpacity>
              {totpToken && (
                <View style={themedStyles.tokenInfo}>
                  <Ionicons 
                    name="information-circle-outline" 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text style={themedStyles.tokenInfoText}>
                    Token configurado correctamente. Usa este token en tu aplicación de autenticación.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

    
      </ScrollView>

      {/* Modal de confirmación para deshabilitar 2FA */}
      <ConfirmationModal
        visible={showDisable2FAModal}
        title="Deshabilitar 2FA"
        message="¿Estás seguro de que quieres deshabilitar la autenticación de doble factor? Esto reducirá la seguridad de tu cuenta."
        confirmText="Deshabilitar"
        cancelText="Cancelar"
        confirmColor="#FF3B30"
        icon="shield-outline"
        loading={disable2FALoading}
        onConfirm={confirmDisable2FA}
        onCancel={cancelDisable2FA}
      />

      {/* TOTP Setup Modal */}
      <TOTPSetupModal
        visible={showTOTPSetup}
        onClose={closeTOTPSetup}
        onSetupComplete={handleTOTPSetupComplete}
        userEmail={user?.email || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkContainer: {
    backgroundColor: '#000',
  },
  lightContainer: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  darkHeader: {
    backgroundColor: '#000',
  },
  lightHeader: {
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
  },
  darkSection: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  lightSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  darkText: {
    color: '#FFD700',
  },
  lightText: {
    color: '#000',
  },
  darkSubtext: {
    color: '#FFD700',
    opacity: 0.7,
  },
  lightSubtext: {
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  // Estilos para TOTP
  totpSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  darkTotpSection: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  lightTotpSection: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E0E0E0',
  },
  totpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  darkTokenInfo: {
    backgroundColor: '#2a2a2a',
  },
  lightTokenInfo: {
    backgroundColor: '#E3F2FD',
  },
  tokenInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
