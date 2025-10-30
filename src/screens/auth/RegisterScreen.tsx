import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ToastService from '../../services/ToastService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Theme } from '../../context/ThemeContext';

interface RegisterScreenProps {
  onRegister: (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  }) => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onRegister, onNavigateToLogin }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const styles = useThemedStyles(createStyles);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onRegister({
        email: formData.email.trim(),
        password: formData.password,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
      });
    } catch (error) {
      ToastService.error('Error', 'No se pudo registrar el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.form}>
            <Text style={styles.title}>Registro</Text>
            
            <Input
              label="Nombre"
              placeholder="John"
              value={formData.nombre}
              onChangeText={(text) => updateFormData('nombre', text)}
              icon="person-outline"
              error={errors.nombre}
            />

            <Input
              label="Apellido"
              placeholder="Doe"
              value={formData.apellido}
              onChangeText={(text) => updateFormData('apellido', text)}
              icon="person-outline"
              error={errors.apellido}
            />

            <Input
              label="Email"
              placeholder="tu.correo@ejemplo.com"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              keyboardType="email-address"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />

            <Input
              label="Repetir Contraseña"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title="Continuar al OTP"
              onPress={handleRegister}
              variant="primary"
              size="large"
              disabled={isLoading}
              style={styles.registerButton}
            />

            <View style={styles.loginLink}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <Button
                title="Inicia Sesión"
                onPress={onNavigateToLogin}
                variant="outline"
                size="small"
                style={styles.loginButton}
              />
            </View>

            <Text style={styles.demoText}>
              Usuario autenticado (Demo ID): 03356457...
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
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
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 16,
    color: theme.colors.primary,
    opacity: 0.8,
  },
  loginButton: {
    marginLeft: 8,
  },
  demoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});