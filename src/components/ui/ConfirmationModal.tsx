import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = '#FF3B30',
  cancelColor = '#666',
  icon = 'warning-outline',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { theme } = useTheme();
  
  const themedStyles = useThemedStyles((theme) => {
    return StyleSheet.create({
      overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
      modalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
      },
      title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        textAlign: 'center',
        marginBottom: 12,
      },
      message: {
        fontSize: 16,
        color: theme.colors.primary,
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
      },
      button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
      },
      cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
      },
      confirmButton: {
        borderWidth: 0,
      },
      buttonText: {
        fontSize: 16,
        fontWeight: '600',
      },
      confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.isDark ? '#000' : '#FFF',
      },
    });
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={themedStyles.overlay}>
        <View style={themedStyles.modalContainer}>
          <View style={themedStyles.iconContainer}>
            <Ionicons name={icon as any} size={48} color={confirmColor} />
          </View>
          
          <Text style={themedStyles.title}>{title}</Text>
          <Text style={themedStyles.message}>{message}</Text>
          
          <View style={themedStyles.buttonContainer}>
            <TouchableOpacity
              style={[themedStyles.button, themedStyles.cancelButton, { borderColor: cancelColor }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[themedStyles.buttonText, { color: cancelColor }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[themedStyles.button, themedStyles.confirmButton, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.isDark ? '#000' : '#FFF'} />
              ) : (
                <Text style={themedStyles.confirmButtonText}>
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

