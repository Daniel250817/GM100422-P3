import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import ToastService from '../services/ToastService';
import SupabaseAuthService from '../services/SupabaseAuthService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import CachedImage from '../components/CachedImage';
import { UserProfile, UserProfileUpdate } from '../interfaces/User';
import { supabase } from '../lib/supabase';
import SupabaseStorageService from '../services/SupabaseStorageService';
import * as ImagePicker from 'expo-image-picker';

interface ProfileScreenProps {
  onNavigateBack: () => void;
}

export default function ProfileScreen({ onNavigateBack }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<UserProfileUpdate>({
    avatar_url: '',
    nombre: '',
    apellido: '',
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Obtener el usuario actual de Supabase
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.log('Error obteniendo usuario:', error);
        ToastService.error('Error', 'No se pudo cargar el perfil');
        return;
      }

      if (supabaseUser) {
        // Crear perfil desde los datos del usuario de Supabase
        const userProfile: UserProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          nombre: supabaseUser.user_metadata?.nombre || '',
          apellido: supabaseUser.user_metadata?.apellido || '',
          created_at: supabaseUser.created_at || '',
          updated_at: supabaseUser.updated_at || '',
          last_sign_in_at: supabaseUser.last_sign_in_at || '',
        };
        
        // Verificar si el archivo del avatar existe
        // Verificar si el avatar existe (opcional, para limpiar URLs inválidas)
        // Comentado para mejor rendimiento - el CachedImage manejará errores
        // if (userProfile.avatar_url) {
        //   const urlParts = userProfile.avatar_url.split('/');
        //   const fileName = urlParts[urlParts.length - 1];
        //   const userId = urlParts[urlParts.length - 2];
        //   const filePath = `${userId}/${fileName}`;
        //   const fileExists = await SupabaseStorageService.checkFileExists(filePath);
        //   if (!fileExists) {
        //     userProfile.avatar_url = '';
        //   }
        // }

        setProfile(userProfile);
        setEditForm({
          avatar_url: userProfile.avatar_url || '',
          nombre: userProfile.nombre,
          apellido: userProfile.apellido,
        });
        console.log('Perfil cargado - Avatar URL:', userProfile.avatar_url);
      }
    } catch (error) {
      console.log('Error cargando perfil:', error);
      ToastService.error('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSelectImage = async () => {
    try {
      // Solicitar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        ToastService.error('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      // Abrir selector de imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadImage(result.assets[0]);
      }
    } catch (error) {
      console.log('Error seleccionando imagen:', error);
      ToastService.error('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleUploadImage = async (imageAsset: any) => {
    try {
      setUploadingImage(true);
      
      // Obtener el usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        ToastService.error('Error', 'Usuario no autenticado');
        return;
      }

      // Subir imagen a Supabase Storage
      const uploadResult = await SupabaseStorageService.uploadAvatar(imageAsset, currentUser.id);
      
      if (!uploadResult.success) {
        ToastService.error('Error', uploadResult.error || 'No se pudo subir la imagen');
        return;
      }

      // Actualizar el perfil con la nueva URL
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_url: uploadResult.url
        }
      });

      if (error) {
        ToastService.error('Error', 'No se pudo actualizar el avatar');
        return;
      }

      ToastService.success('Éxito', 'Avatar actualizado correctamente');
      console.log('Avatar URL actualizada:', uploadResult.url);
      
      // Recargar perfil para mostrar la nueva imagen
      await loadProfile();
      
    } catch (error) {
      console.log('Error subiendo imagen:', error);
      ToastService.error('Error', 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setEditLoading(true);
      
      // Validar campos requeridos
      if (!editForm.nombre.trim() || !editForm.apellido.trim()) {
        ToastService.error('Error', 'Nombre y apellido son requeridos');
        return;
      }

      // Actualizar perfil en Supabase
      const updateData: UserProfileUpdate = {
        avatar_url: editForm.avatar_url?.trim() || '',
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
      };

      const { error } = await supabase.auth.updateUser({
        data: updateData
      });

      if (error) {
        ToastService.error('Error', 'No se pudo actualizar el perfil');
        return;
      }

      ToastService.success('Éxito', 'Perfil actualizado correctamente');
      setShowEditModal(false);
      await loadProfile(); // Recargar perfil
      
    } catch (error) {
      console.log('Error actualizando perfil:', error);
      ToastService.error('Error', 'No se pudo actualizar el perfil');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
  };

  const validatePasswordField = (field: string, value: string) => {
    const errors = { ...passwordErrors };

    switch (field) {
      case 'newPassword':
        if (value.length > 0 && value.length < 6) {
          errors.newPassword = 'Mínimo 6 caracteres';
        } else {
          errors.newPassword = '';
        }
        // Validar confirmación cuando cambia la nueva contraseña
        if (passwordForm.confirmPassword && value !== passwordForm.confirmPassword) {
          errors.confirmPassword = 'Las contraseñas no coinciden';
        } else if (passwordForm.confirmPassword && value === passwordForm.confirmPassword) {
          errors.confirmPassword = '';
        }
        break;
      case 'confirmPassword':
        if (value && value !== passwordForm.newPassword) {
          errors.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          errors.confirmPassword = '';
        }
        break;
      default:
        break;
    }

    setPasswordErrors(errors);
  };

  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; percentage: number } => {
    if (!password) return { strength: 'weak', percentage: 0 };
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;

    if (strength < 40) return { strength: 'weak', percentage: strength };
    if (strength < 70) return { strength: 'medium', percentage: strength };
    return { strength: 'strong', percentage: strength };
  };

  const handleSavePassword = async () => {
    try {
      setChangePasswordLoading(true);

      // Validar campos
      const errors: typeof passwordErrors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };

      if (!passwordForm.currentPassword.trim()) {
        errors.currentPassword = 'La contraseña actual es requerida';
        setPasswordErrors(errors);
        ToastService.error('Error', 'La contraseña actual es requerida');
        return;
      }

      if (!passwordForm.newPassword.trim()) {
        errors.newPassword = 'La nueva contraseña es requerida';
        setPasswordErrors(errors);
        ToastService.error('Error', 'La nueva contraseña es requerida');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        errors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres';
        setPasswordErrors(errors);
        ToastService.error('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
        setPasswordErrors(errors);
        ToastService.error('Error', 'Las contraseñas no coinciden');
        return;
      }

      if (passwordForm.currentPassword === passwordForm.newPassword) {
        errors.newPassword = 'La nueva contraseña debe ser diferente a la actual';
        setPasswordErrors(errors);
        ToastService.error('Error', 'La nueva contraseña debe ser diferente a la actual');
        return;
      }

      // Actualizar contraseña en Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        console.log('Error actualizando contraseña:', error);
        if (error.message.includes('current password') || error.message.includes('Password')) {
          errors.currentPassword = 'La contraseña actual es incorrecta';
          setPasswordErrors(errors);
        }
        ToastService.error('Error', 'No se pudo actualizar la contraseña');
        return;
      }

      ToastService.success('Éxito', 'Contraseña actualizada correctamente');
      setShowChangePasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error) {
      console.log('Error cambiando contraseña:', error);
      ToastService.error('Error', 'No se pudo cambiar la contraseña');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleCancelPassword = () => {
    setShowChangePasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      ToastService.success('Sesión cerrada', 'Has cerrado sesión correctamente');
    } catch (error) {
      console.log('Error cerrando sesión:', error);
      ToastService.error('Error', 'No se pudo cerrar la sesión');
    } finally {
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Información del Usuario */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={styles.avatar}
              onPress={handleSelectImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : profile?.avatar_url ? (
                <CachedImage
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  fallbackIcon="person"
                  fallbackIconSize={40}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={theme.colors.primary} />
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {profile?.nombre} {profile?.apellido}
          </Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
       
        </View>

        {/* Información Detallada */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Información de la Cuenta</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Miembro desde</Text>
              <Text style={styles.infoValue}>
                {formatDate(profile?.created_at || '')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Último acceso</Text>
              <Text style={styles.infoValue}>
                {formatDate(profile?.last_sign_in_at || '')}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Acciones</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleChangePassword}
          >
            <Ionicons name="key-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionText}>Cambiar Contraseña</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
            <Text style={[styles.actionText, styles.logoutText]}>Cerrar Sesión</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal de Edición */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveProfile}
              disabled={editLoading}
            >
              {editLoading ? (
                <ActivityIndicator size="small" color={theme.isDark ? '#000' : '#FFF'} />
              ) : (
                <Text style={styles.modalSaveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={editForm.nombre}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, nombre: text }))}
                placeholder="Ingresa tu nombre"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apellido *</Text>
              <TextInput
                style={styles.input}
                value={editForm.apellido}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, apellido: text }))}
                placeholder="Ingresa tu apellido"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Avatar</Text>
              <TouchableOpacity 
                style={styles.avatarUploadButton}
                onPress={handleSelectImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color={theme.colors.primary} />
                    <Text style={styles.avatarUploadText}>
                      {editForm.avatar_url ? 'Cambiar Avatar' : 'Seleccionar Avatar'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de confirmación de logout */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Cerrar Sesión"
        message="¿Estás seguro de que quieres cerrar sesión? Tendrás que volver a iniciar sesión para acceder a tu cuenta."
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        confirmColor="#FF3B30"
        icon="log-out-outline"
        loading={logoutLoading}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />

      {/* Modal de cambio de contraseña */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleCancelPassword}
              activeOpacity={0.6}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Contraseña Actual */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña Actual *</Text>
              <View style={[
                styles.passwordInputContainer,
                passwordErrors.currentPassword && styles.passwordInputContainerError
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, currentPassword: text }));
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                    }
                  }}
                  placeholder="Ingresa tu contraseña actual"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry={!showPasswords.current}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  <Ionicons
                    name={showPasswords.current ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordErrors.currentPassword ? (
                <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
              ) : null}
            </View>

            {/* Nueva Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva Contraseña *</Text>
              <View style={[
                styles.passwordInputContainer,
                passwordErrors.newPassword && styles.passwordInputContainerError
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, newPassword: text }));
                    validatePasswordField('newPassword', text);
                  }}
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry={!showPasswords.new}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  <Ionicons
                    name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordForm.newPassword.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        {
                          width: `${getPasswordStrength(passwordForm.newPassword).percentage}%`,
                          backgroundColor: getPasswordStrength(passwordForm.newPassword).strength === 'weak'
                            ? theme.colors.error
                            : getPasswordStrength(passwordForm.newPassword).strength === 'medium'
                            ? theme.colors.warning
                            : theme.colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.passwordStrengthText,
                    {
                      color: getPasswordStrength(passwordForm.newPassword).strength === 'weak'
                        ? theme.colors.error
                        : getPasswordStrength(passwordForm.newPassword).strength === 'medium'
                        ? theme.colors.warning
                        : theme.colors.success,
                    },
                  ]}>
                    {getPasswordStrength(passwordForm.newPassword).strength === 'weak' && 'Débil'}
                    {getPasswordStrength(passwordForm.newPassword).strength === 'medium' && 'Media'}
                    {getPasswordStrength(passwordForm.newPassword).strength === 'strong' && 'Fuerte'}
                  </Text>
                </View>
              )}
              {passwordErrors.newPassword ? (
                <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
              ) : null}
            </View>

            {/* Confirmar Nueva Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Nueva Contraseña *</Text>
              <View style={[
                styles.passwordInputContainer,
                passwordErrors.confirmPassword && styles.passwordInputContainerError,
                passwordForm.confirmPassword && 
                passwordForm.newPassword === passwordForm.confirmPassword && 
                !passwordErrors.confirmPassword && 
                styles.passwordInputContainerSuccess
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => {
                    setPasswordForm(prev => ({ ...prev, confirmPassword: text }));
                    validatePasswordField('confirmPassword', text);
                  }}
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry={!showPasswords.confirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  <Ionicons
                    name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordForm.confirmPassword && 
               passwordForm.newPassword === passwordForm.confirmPassword && 
               !passwordErrors.confirmPassword && (
                <View style={styles.successIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.successText, { marginLeft: 6 }]}>Las contraseñas coinciden</Text>
                </View>
              )}
              {passwordErrors.confirmPassword ? (
                <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Requisitos de Contraseña */}
            <View style={styles.passwordInfo}>
              <Text style={styles.passwordInfoTitle}>Requisitos de contraseña:</Text>
              <View style={styles.passwordRequirement}>
                <Ionicons
                  name={passwordForm.newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={passwordForm.newPassword.length >= 6 ? theme.colors.success : theme.colors.textSecondary}
                />
                <Text style={[
                  styles.passwordInfoText,
                  { marginLeft: 10 },
                  passwordForm.newPassword.length >= 6 && styles.passwordInfoTextCompleted
                ]}>
                  La contraseña debe tener al menos 6 caracteres
                </Text>
              </View>
              <View style={styles.passwordRequirement}>
                <Ionicons
                  name={
                    /[a-zA-Z]/.test(passwordForm.newPassword) && 
                    /[0-9]/.test(passwordForm.newPassword) && 
                    /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                      ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={
                    /[a-zA-Z]/.test(passwordForm.newPassword) && 
                    /[0-9]/.test(passwordForm.newPassword) && 
                    /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                      ? theme.colors.success : theme.colors.textSecondary}
                />
                <Text style={[
                  styles.passwordInfoText,
                  { marginLeft: 10 },
                  /[a-zA-Z]/.test(passwordForm.newPassword) && 
                  /[0-9]/.test(passwordForm.newPassword) && 
                  /[^A-Za-z0-9]/.test(passwordForm.newPassword) &&
                  styles.passwordInfoTextCompleted
                ]}>
                  Usa una combinación de letras, números y símbolos
                </Text>
              </View>
            </View>

            {/* Botón Guardar */}
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                changePasswordLoading && styles.modalSaveButtonDisabled
              ]}
              onPress={handleSavePassword}
              disabled={changePasswordLoading}
              activeOpacity={0.7}
            >
              {changePasswordLoading ? (
                <ActivityIndicator size="small" color={theme.isDark ? '#000' : '#FFF'} />
              ) : (
                <Text style={styles.modalSaveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useThemedStyles>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarContainer: {
    marginBottom: 16,
    padding: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: theme.colors.primary,
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    opacity: 0.8,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  actionText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginLeft: 12,
    flex: 1,
  },
  logoutText: {
    color: theme.colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    minHeight: 64,
  },
  modalBackButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalSaveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalSaveText: {
    fontSize: 16,
    color: theme.isDark ? '#000' : '#FFF',
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },
  avatarUploadButton: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadText: {
    color: theme.colors.primary,
    fontSize: 16,
    marginLeft: 8,
  },
  debugButton: {
    backgroundColor: theme.colors.border,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  debugText: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  passwordInputContainerError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  passwordInputContainerSuccess: {
    borderColor: theme.colors.success,
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  passwordStrengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
    marginLeft: 8,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  successText: {
    color: theme.colors.success,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  passwordInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passwordInfoTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  passwordRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  passwordInfoText: {
    color: theme.colors.primary,
    fontSize: 14,
    flex: 1,
    opacity: 0.7,
  },
  passwordInfoTextCompleted: {
    opacity: 1,
    fontWeight: '500',
  },
});
