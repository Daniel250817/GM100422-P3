import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

interface TokenDisplayProps {
  token: string;
  onTokenChange: (token: string) => void;
  placeholder?: string;
  label?: string;
}

export default function TokenDisplay({ 
  token, 
  onTokenChange, 
  placeholder = "Pega aquí el código de configuración TOTP",
  label = "Copiar para generar token"
}: TokenDisplayProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(token);
      Alert.alert('Copiado', 'Token copiado al portapapeles');
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar el token');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        onTokenChange(clipboardContent);
        Alert.alert('Pegado', 'Token pegado desde el portapapeles');
      } else {
        Alert.alert('Portapapeles vacío', 'No hay contenido en el portapapeles');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder al portapapeles');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.label, { color: theme.colors.primary }]}>
        {label}
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            { 
              color: theme.colors.primary,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background
            }
          ]}
          value={token}
          onChangeText={onTokenChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.primary + '80'}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={isEditing}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={isEditing ? () => setIsEditing(false) : () => setIsEditing(true)}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "create-outline"} 
              size={16} 
              color={theme.isDark ? '#000' : '#FFF'} 
            />
            <Text style={[styles.buttonText, { color: theme.isDark ? '#000' : '#FFF' }]}>
              {isEditing ? 'Guardar' : 'Editar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
            onPress={handleCopyToClipboard}
            disabled={!token}
          >
            <Ionicons name="copy-outline" size={16} color={theme.isDark ? '#000' : '#FFF'} />
            <Text style={[styles.buttonText, { color: theme.isDark ? '#000' : '#FFF' }]}>
              Copiar
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.info }]}
            onPress={handlePasteFromClipboard}
          >
            <Ionicons name="clipboard-outline" size={16} color={theme.isDark ? '#000' : '#FFF'} />
            <Text style={[styles.buttonText, { color: theme.isDark ? '#000' : '#FFF' }]}>
              Pegar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    gap: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
