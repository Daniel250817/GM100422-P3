import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AIChatService from '../services/AIChatService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import ToastService from '../services/ToastService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: {
    type: 'start_routine' | 'create_schedule' | 'start_work_session' | 'get_info';
    data?: any;
    suggestions?: string[];
  };
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  onAction?: (action: any) => void;
}

export default function AIChatModal({ visible, onClose, onAction }: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (visible) {
      // Animar entrada del modal
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Cargar historial de chat si no hay mensajes
      if (messages.length === 0 && user?.id) {
        loadChatHistory();
      }
    } else {
      // Animar salida del modal
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, user?.id]);

  // Listener del teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadChatHistory = async () => {
    if (!user?.id) return;

    try {
      const history = await AIChatService.loadChatHistory(user.id);
      
      if (history.length > 0) {
        // El servicio ya convierte los mensajes al formato correcto
        setMessages(history);
      } else {
        // Mensaje de bienvenida si no hay historial
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: '¡Hola! Soy tu asistente de TimeTrack. ¿En qué puedo ayudarte?',
          timestamp: new Date(),
          action: {
            type: 'get_info',
            suggestions: ['Iniciar rutina', 'Crear horario', 'Iniciar jornada', 'Ver mi actividad']
          }
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.log('Error cargando historial:', error);
      
      // Mensaje de bienvenida en caso de error
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de TimeTrack. ¿En qué puedo ayudarte?',
        timestamp: new Date(),
        action: {
          type: 'get_info',
          suggestions: ['Iniciar rutina', 'Crear horario', 'Iniciar jornada', 'Ver mi actividad']
        }
      };
      setMessages([welcomeMessage]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Crear mensaje temporal del usuario (se actualizará con datos reales después)
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await AIChatService.processMessage(inputText.trim(), user?.id?.toString() || '');
      
      // Simular delay de escritura
      setTimeout(async () => {
        // Recargar historial completo para obtener los created_at reales de la base de datos
        await loadChatHistory();
        setIsTyping(false);
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      console.log('Error enviando mensaje:', error);
      setIsTyping(false);
      setIsLoading(false);
      ToastService.error('Error', 'No se pudo procesar tu mensaje');
      // Recargar historial para mantener consistencia
      await loadChatHistory();
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handleActionPress = async (action: any) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const result = await AIChatService.executeAction(action, user.id);
      
      if (result.success) {
        ToastService.success('Acción completada', result.message);
        
        // Notificar a la pantalla padre
        if (onAction) {
          onAction(action);
        }
        
        // Agregar mensaje de confirmación
        const confirmMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmMessage]);
      } else {
        ToastService.error('Error', result.message);
      }
    } catch (error) {
      console.log('Error ejecutando acción:', error);
      ToastService.error('Error', 'No se pudo ejecutar la acción');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id} style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>
          
          {message.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(message.action)}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>
                {message.action.type === 'start_routine' && 'Iniciar Rutina'}
                {message.action.type === 'create_schedule' && 'Crear Horario'}
                {message.action.type === 'start_work_session' && 'Iniciar Jornada'}
                {message.action.type === 'get_info' && 'Ver Información'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderSuggestions = () => {
    const suggestions = [
      'Iniciar mi última rutina',
      'Crear un horario de trabajo',
      'Iniciar mi jornada',
      'Ver mi actividad reciente'
    ];

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Sugerencias:</Text>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.overlayTouchable} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <Animated.View 
        style={[
          styles.modal,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [400, 0],
              }),
            }],
            opacity: slideAnim,
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Track IA - Power By Gemini</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.typingText}>Escribiendo...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {messages.length === 1 && renderSuggestions()}

        <View style={[styles.keyboardAvoidingView, { marginBottom: keyboardHeight }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={500}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.isDark ? theme.colors.background : '#fff'} />
              ) : (
                <Ionicons name="send" size={20} color={theme.isDark ? theme.colors.background : '#fff'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  overlayTouchable: {
    flex: 1,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    maxHeight: 400,
    backgroundColor: theme.colors.background,
  },
  messagesContent: {
    paddingVertical: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 15,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
  },
  assistantBubble: {
    backgroundColor: theme.isDark ? theme.colors.surface : '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: theme.isDark ? theme.colors.background : '#fff',
  },
  assistantText: {
    color: theme.colors.text,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: theme.isDark ? theme.colors.background : '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  timestampUser: {
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  timestampAssistant: {
    color: theme.colors.textSecondary,
    textAlign: 'left',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  typingBubble: {
    backgroundColor: theme.isDark ? theme.colors.surface : '#f0f0f0',
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  suggestionsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: theme.isDark ? theme.colors.surface : '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minHeight: 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
});
