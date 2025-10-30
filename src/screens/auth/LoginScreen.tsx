import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ToastService from '../../services/ToastService';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const styles = useThemedStyles(createStyles);

  const validateEmail = (email: string) => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validar email
    if (!email.trim()) {
      setErrors({ email: 'El email es requerido' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'El email no es válido' });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      ToastService.error('Error', 'No se pudo enviar el código de verificación');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors({});
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Limpiar errores y campos al refrescar
    setErrors({});
    setEmail('');
    setPassword('');
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={styles.refreshControl.color}
              colors={[styles.refreshControl.color]}
            />
          }
        >
          <Card style={styles.form}>
            <Text style={styles.title}>Iniciar Sesión</Text>
            
            <Input
              label="Email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={updateEmail}
              keyboardType="email-address"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Contraseña"
              placeholder="........"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <Button
              title="Entrar"
              onPress={handleLogin}
              variant="primary"
              size="large"
              disabled={isLoading}
              style={styles.loginButton}
            />

            <View style={styles.registerLink}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <Button
                title="Regístrate aquí"
                onPress={onNavigateToRegister}
                variant="outline"
                size="small"
                style={styles.registerButton}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useThemedStyles>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  registerText: {
    fontSize: 16,
    color: theme.colors.primary,
    opacity: 0.8,
  },
  registerButton: {
    marginLeft: 8,
  },
  refreshControl: {
    color: theme.colors.primary,
  },
});