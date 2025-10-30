import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import AIChatService from '../services/AIChatService';
import GeminiService from '../services/GeminiService';
import ToastService from '../services/ToastService';

interface AIConfigScreenProps {
  onGoBack: () => void;
}

export default function AIConfigScreen({ onGoBack }: AIConfigScreenProps) {
  const { theme } = useTheme();
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);
  const themedStyles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    switchInfo: {
      flex: 1,
      marginRight: 16,
    },
    switchTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    switchDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      marginRight: 8,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
    },
    infoButton: {
      padding: 8,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#28a745',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 8,
    },
    testButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    capabilityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    capabilityText: {
      flex: 1,
      marginLeft: 12,
    },
    capabilityTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    capabilityDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    costContainer: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
    },
    costText: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 4,
    },
    costBold: {
      fontWeight: '600',
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      backgroundColor: '#ccc',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    envStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#e8f5e8',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    envStatusText: {
      color: '#28a745',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
      flex: 1,
    },
  }));
  const [apiKey, setApiKey] = useState('');
  const [useGemini, setUseGemini] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar configuración de variables de entorno
  useEffect(() => {
    const checkEnvConfig = () => {
      const envApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const hasKey = !!envApiKey;
      setHasEnvApiKey(hasKey);
      
      if (hasKey) {
        setUseGemini(true);
        setIsEnvConfigured(true);
        console.log('🔑 API key de Gemini encontrada en variables de entorno');
      } else {
        console.log('⚠️ No se encontró API key de Gemini en variables de entorno');
      }
    };

    checkEnvConfig();
  }, []);

  const handleSaveConfig = async () => {
    if (useGemini && !apiKey.trim()) {
      ToastService.error('Error', 'Por favor ingresa tu API key de Gemini');
      return;
    }

    try {
      setIsLoading(true);
      
      if (useGemini) {
        AIChatService.setGeminiApiKey(apiKey.trim());
        AIChatService.setUseGemini(true);
        ToastService.success('Configuración guardada', 'Gemini configurado correctamente');
      } else {
        AIChatService.setUseGemini(false);
        ToastService.info('Configuración guardada', 'Usando respuestas predefinidas');
      }
      
      // Aquí podrías guardar la configuración en AsyncStorage
      // await AsyncStorage.setItem('ai_config', JSON.stringify({ useGemini, apiKey }));
      
    } catch (error) {
      console.log('Error guardando configuración:', error);
      ToastService.error('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      ToastService.error('Error', 'Por favor ingresa tu API key primero');
      return;
    }

    try {
      setIsLoading(true);
      
      // Probar la conexión con Gemini
      GeminiService.setApiKey(apiKey.trim());
      const isConnected = await GeminiService.verifyConnection();
      
      if (isConnected) {
        ToastService.success('Conexión exitosa', 'Gemini está funcionando correctamente');
      } else {
        ToastService.error('Error', 'No se pudo conectar con Gemini');
      }
      
    } catch (error) {
      console.log('Error probando conexión:', error);
      ToastService.error('Error', 'No se pudo conectar con Gemini. Verifica tu API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const showApiKeyInfo = () => {
    Alert.alert(
      '¿Cómo obtener tu API Key de Gemini?',
      '1. Ve a https://makersuite.google.com/app/apikey\n' +
      '2. Inicia sesión con tu cuenta de Google\n' +
      '3. Haz clic en "Create API Key"\n' +
      '4. Copia la clave generada\n' +
      '5. Pégala en el campo de arriba\n\n' +
      'Nota: Mantén tu API key segura y no la compartas.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={onGoBack} style={themedStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={themedStyles.title}>Configuración de IA (Gemini)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={themedStyles.content} showsVerticalScrollIndicator={false}>
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>🤖 Asistente de IA</Text>
          <Text style={themedStyles.sectionDescription}>
            Configura tu asistente de IA para obtener respuestas más inteligentes y personalizadas.
          </Text>
          
          {hasEnvApiKey && (
            <View style={themedStyles.envStatusContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={themedStyles.envStatusText}>
                API key configurada automáticamente desde variables de entorno
              </Text>
            </View>
          )}
        </View>

        <View style={themedStyles.section}>
          <View style={themedStyles.switchContainer}>
            <View style={themedStyles.switchInfo}>
              <Text style={themedStyles.switchTitle}>Usar Google Gemini</Text>
              <Text style={themedStyles.switchDescription}>
                {hasEnvApiKey 
                  ? 'Configurado automáticamente desde variables de entorno'
                  : 'Respuestas más inteligentes y contextuales'
                }
              </Text>
            </View>
            <Switch
              value={useGemini}
              onValueChange={hasEnvApiKey ? undefined : setUseGemini}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
              thumbColor={useGemini ? '#fff' : '#f4f3f4'}
              disabled={hasEnvApiKey}
            />
          </View>
        </View>

        {useGemini && (
          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>🔑 API Key de Gemini</Text>
            <Text style={themedStyles.sectionDescription}>
              {hasEnvApiKey 
                ? 'API key configurada automáticamente desde variables de entorno (.env)'
                : 'Ingresa tu API key de Google Gemini para habilitar el asistente inteligente.'
              }
            </Text>
            
            {!hasEnvApiKey && (
              <>
                <View style={themedStyles.inputContainer}>
                  <TextInput
                    style={themedStyles.textInput}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="sk-..."
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={themedStyles.infoButton}
                    onPress={showApiKeyInfo}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={themedStyles.testButton}
                  onPress={handleTestConnection}
                  disabled={isLoading || !apiKey.trim()}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={themedStyles.testButtonText}>Probar Conexión</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>💡 Capacidades del Asistente</Text>
          
          <View style={themedStyles.capabilityItem}>
            <Ionicons name="play-circle-outline" size={24} color={theme.colors.primary} />
            <View style={themedStyles.capabilityText}>
              <Text style={themedStyles.capabilityTitle}>Iniciar Rutinas</Text>
              <Text style={themedStyles.capabilityDescription}>
                "Inicia mi última rutina" o "Empieza la rutina de ejercicio"
              </Text>
            </View>
          </View>

          <View style={themedStyles.capabilityItem}>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <View style={themedStyles.capabilityText}>
              <Text style={themedStyles.capabilityTitle}>Crear Horarios</Text>
              <Text style={themedStyles.capabilityDescription}>
                "Crea un horario de trabajo" o "Programa mi estudio"
              </Text>
            </View>
          </View>

          <View style={themedStyles.capabilityItem}>
            <Ionicons name="briefcase-outline" size={24} color={theme.colors.primary} />
            <View style={themedStyles.capabilityText}>
              <Text style={themedStyles.capabilityTitle}>Iniciar Jornadas</Text>
              <Text style={themedStyles.capabilityDescription}>
                "Inicia mi jornada" o "Empieza a trabajar en el proyecto X"
              </Text>
            </View>
          </View>

          <View style={themedStyles.capabilityItem}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
            <View style={themedStyles.capabilityText}>
              <Text style={themedStyles.capabilityTitle}>Información</Text>
              <Text style={themedStyles.capabilityDescription}>
                "¿Cuál fue mi última rutina?" o "Muéstrame mi actividad"
              </Text>
            </View>
          </View>
        </View>

        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>💰 Costos</Text>
          <View style={themedStyles.costContainer}>
            <Text style={themedStyles.costText}>
              <Text style={themedStyles.costBold}>Google Gemini:</Text> Gratis hasta 15 requests/minuto
            </Text>
            <Text style={themedStyles.costText}>
              <Text style={themedStyles.costBold}>Uso típico:</Text> Gratis para uso personal
            </Text>
            <Text style={themedStyles.costText}>
              <Text style={themedStyles.costBold}>Sin Gemini:</Text> Gratis (respuestas básicas)
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={themedStyles.footer}>
        <TouchableOpacity
          style={[themedStyles.saveButton, isLoading && themedStyles.saveButtonDisabled]}
          onPress={handleSaveConfig}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={themedStyles.saveButtonText}>Guardando...</Text>
          ) : (
            <Text style={themedStyles.saveButtonText}>Guardar Configuración</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

