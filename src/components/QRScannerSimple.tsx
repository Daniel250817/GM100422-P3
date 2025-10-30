import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

export default function QRScannerSimple({ visible, onClose, onScan, title = "Escanear Código QR" }: QRScannerProps) {
  const { theme } = useTheme();
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      // Verificar que sea un código TOTP válido
      if (manualCode.startsWith('otpauth://totp/')) {
        onScan(manualCode);
        onClose();
      } else {
        Alert.alert(
          'Código Inválido',
          'Este no es un código válido para autenticación de dos factores. Por favor, ingresa un código TOTP válido.',
          [
            { text: 'OK', onPress: () => setManualCode('') }
          ]
        );
      }
    } else {
      Alert.alert('Error', 'Por favor ingresa un código');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.primary }]}>{title}</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="qr-code" size={64} color={theme.colors.primary} />
          </View>
          
          <Text style={[styles.subtitle, { color: theme.colors.primary }]}>
            Escáner QR no disponible
          </Text>
          
          <Text style={[styles.description, { color: theme.colors.primary }]}>
            Por el momento, puedes ingresar manualmente el código de configuración TOTP:
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>
              Código de configuración TOTP:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.colors.primary,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface
                }
              ]}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="otpauth://totp/..."
              placeholderTextColor={theme.colors.primary + '60'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleManualSubmit}
          >
            <Text style={[styles.submitButtonText, { color: theme.isDark ? '#000' : '#FFF' }]}>
              Configurar TOTP
            </Text>
          </TouchableOpacity>

          <View style={styles.helpContainer}>
            <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
            <Text style={[styles.helpText, { color: theme.colors.primary }]}>
              Copia el código de configuración desde tu aplicación de autenticación (Google Authenticator, Authy, etc.)
            </Text>
          </View>
        </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  helpText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});
