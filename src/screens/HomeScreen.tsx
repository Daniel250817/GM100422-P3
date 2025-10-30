import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles, useCommonStyles } from '../hooks/useThemedStyles';
import { useThemeForceUpdate } from '../hooks/useThemeForceUpdate';
import { useThemeSync } from '../hooks/useThemeSync';
import { useSettings } from '../hooks/useSettings';
import ToastService from '../services/ToastService';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import AIChatModal from '../components/AIChatModal';
import CachedImage from '../components/CachedImage';
import { supabase } from '../lib/supabase';
import SupabaseRoutineService from '../services/SupabaseRoutineService';
import { Routine } from '../interfaces/Routine';

interface HomeScreenProps {
  onNavigateToStartWork: () => void;
  onNavigateToScheduleManagement: () => void;
  onNavigateToRoutineManagement: () => void;
  onNavigateToProfile: () => void;
  onNavigateToSettings: () => void;
  onNavigateToStatistics: () => void;
  onNavigateToHelp: () => void;
}

export default function HomeScreen({ onNavigateToStartWork, onNavigateToScheduleManagement, onNavigateToRoutineManagement, onNavigateToProfile, onNavigateToSettings, onNavigateToStatistics, onNavigateToHelp }: HomeScreenProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { forceUpdate } = useThemeForceUpdate();
  const { isSynced } = useThemeSync();
  const { settings } = useSettings();
  const commonStyles = useCommonStyles();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [completedRoutines, setCompletedRoutines] = useState<Routine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);

  // Usar referencia estable global para el mismo avatar_url
  const avatarSourceRef = useRef<{ uri: string } | null>(null);
  
  const avatarSource = useMemo(() => {
    if (userProfile?.avatar_url) {
      // Mantener la misma referencia si la URI no cambió
      if (avatarSourceRef.current?.uri !== userProfile.avatar_url) {
        avatarSourceRef.current = { uri: userProfile.avatar_url };
      }
      return avatarSourceRef.current;
    }
    avatarSourceRef.current = null;
    return null;
  }, [userProfile?.avatar_url]);

  useEffect(() => {
    loadUserProfile();
    loadCompletedRoutines();
  }, [user]);

  const loadUserProfile = async () => {
    try {
      if (user) {
        // Obtener el usuario actual de Supabase para obtener el avatar
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.log('Error obteniendo usuario de Supabase:', error);
          // Fallback a datos básicos
          const newProfile = {
            avatar_url: '',
            nombre: user.nombre || '',
            apellido: user.apellido || '',
          };
          // Solo actualizar si cambió
          setUserProfile((prev: any) => {
            if (!prev || prev.avatar_url !== newProfile.avatar_url || 
                prev.nombre !== newProfile.nombre || prev.apellido !== newProfile.apellido) {
              return newProfile;
            }
            return prev;
          });
          return;
        }

        if (supabaseUser) {
          const newAvatarUrl = supabaseUser.user_metadata?.avatar_url || '';
          const newProfile = {
            avatar_url: newAvatarUrl,
            nombre: user.nombre || '',
            apellido: user.apellido || '',
          };
          // Solo actualizar si cambió la URL del avatar u otros datos
          setUserProfile((prev: any) => {
            if (!prev || prev.avatar_url !== newAvatarUrl || 
                prev.nombre !== newProfile.nombre || prev.apellido !== newProfile.apellido) {
              return newProfile;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.log('Error cargando perfil:', error);
    }
  };

  const loadCompletedRoutines = async () => {
    try {
      setRoutinesLoading(true);
      
      const result = await SupabaseRoutineService.getRoutines();
      
      if (result.success && result.routines) {
        // Filtrar solo las rutinas completadas y ordenar por fecha de actualización
        const completed = result.routines
          .filter(routine => routine.completada)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        setCompletedRoutines(completed);
      } else {
        console.log('Error cargando rutinas:', result.message);
      }
    } catch (error) {
      console.log('Error cargando rutinas completadas:', error);
    } finally {
      setRoutinesLoading(false);
    }
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

  const handleAIAction = (action: any) => {
    console.log('🤖 Acción de IA ejecutada:', action);
    
    switch (action.type) {
      case 'start_routine':
        // Navegar a gestión de rutinas o iniciar rutina específica
        onNavigateToRoutineManagement();
        break;
      case 'create_schedule':
        // Navegar a gestión de horarios
        onNavigateToScheduleManagement();
        break;
      case 'start_work_session':
        // Navegar a iniciar trabajo
        onNavigateToStartWork();
        break;
      case 'get_info':
        // Mostrar información o refrescar datos
        loadUserProfile();
        break;
      default:
        console.log('Acción no reconocida:', action.type);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadCompletedRoutines()]);
    setRefreshing(false);
  };

  const themedStyles = useThemedStyles((theme) => {
    console.log('🏠 HomeScreen recalculando estilos:', { isDark: theme.isDark });
    return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 20,
      backgroundColor: theme.colors.background,
    },
    dashboardTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    headerIcons: {
      flexDirection: 'row',
      gap: 16,
    },
    headerIcon: {
      padding: 8,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      marginBottom: 16,
      paddingTop: 0,
    },
    welcomeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    welcomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      backgroundColor: theme.colors.surface,
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    avatarImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    userDetails: {
      flex: 1,
    },
    greeting: {
      fontSize: 12,
      color: theme.colors.primary,
      opacity: 0.8,
      marginBottom: 6,
    },
    userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 2,
    },
    userEmail: {
      fontSize: 12,
      color: theme.colors.primary,
      opacity: 0.8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tile: {
      width: '48%',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tileTall: {
      minHeight: 220,
    },
    tileWide: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    tileIcon: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    smallButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    smallButtonText: {
      color: theme.isDark ? '#000' : '#FFF',
      fontWeight: 'bold',
      fontSize: 12,
    },
    tileTitle: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 6,
    },
    tileSubtitle: {
      color: theme.colors.primary,
      opacity: 0.8,
      fontSize: 12,
      lineHeight: 18,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginTop: 8,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.primary,
      opacity: 0.8,
      textAlign: 'center',
    },
    supportBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 8,
    },
    supportLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    supportText: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    supportButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    supportButtonText: {
      color: theme.isDark ? '#000' : '#FFF',
      fontWeight: 'bold',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    logoutButtonText: {
      color: theme.colors.error,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
  });
  });

  return (
    <View style={themedStyles.container}>
      {/* Header con Dashboard y iconos */}
      <View style={themedStyles.topHeader}>
        <Text style={themedStyles.dashboardTitle}>Dashboard</Text>
        <View style={themedStyles.headerIcons}>
          <TouchableOpacity style={themedStyles.headerIcon} onPress={onNavigateToProfile}>
            <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={themedStyles.headerIcon} onPress={onNavigateToSettings}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={themedStyles.headerIcon} onPress={() => setShowAIChat(true)}>
            <Ionicons name="chatbubble-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        contentContainerStyle={themedStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header Dashboard */}
        <View style={themedStyles.header}> 
          <TouchableOpacity style={themedStyles.welcomeCard} onPress={onNavigateToProfile}>
            <View style={themedStyles.welcomeRow}>
              <View style={themedStyles.avatar}> 
                {settings?.show_profile_image && avatarSource ? (
                  <CachedImage
                    source={avatarSource}
                    style={themedStyles.avatarImage}
                    fallbackIcon="person"
                    fallbackIconSize={28}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={28} color={theme.colors.primary} />
                )}
              </View>
              <View style={themedStyles.userDetails}>
                <Text style={themedStyles.greeting}>¡Hola de nuevo!</Text>
                <Text style={themedStyles.userName}>{user?.nombre} {user?.apellido}</Text>
                <Text style={themedStyles.userEmail}>{user?.email}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Grid de Tarjetas */}
        <View style={themedStyles.grid}>
          {/* Iniciar jornada */}
          <TouchableOpacity style={themedStyles.tile} onPress={onNavigateToStartWork}>
            <View style={themedStyles.tileHeader}>
              <View style={themedStyles.tileIcon}><Ionicons name="play" size={20} color={theme.colors.primary} /></View>
              <TouchableOpacity 
                style={themedStyles.smallButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigateToStartWork();
                }}
              >
                <Text style={themedStyles.smallButtonText}>Abrir</Text>
              </TouchableOpacity>
            </View>
            <Text style={themedStyles.tileTitle}>Iniciar jornada</Text>
            <Text style={themedStyles.tileSubtitle}>Comienza tu sesión de trabajo y registra tu tiempo.</Text>
          </TouchableOpacity>

          {/* Horarios */}
          <TouchableOpacity style={themedStyles.tile} onPress={onNavigateToScheduleManagement}>
            <View style={themedStyles.tileHeader}>
              <View style={themedStyles.tileIcon}><Ionicons name="calendar-outline" size={20} color={theme.colors.primary} /></View>
              <TouchableOpacity 
                style={themedStyles.smallButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigateToScheduleManagement();
                }}
              >
                <Text style={themedStyles.smallButtonText}>Abrir</Text>
              </TouchableOpacity>
            </View>
            <Text style={themedStyles.tileTitle}>Horarios</Text>
            <Text style={themedStyles.tileSubtitle}>Organiza tus turnos y disponibilidad.</Text>
          </TouchableOpacity>

          {/* Mis Rutinas */}
          <TouchableOpacity style={themedStyles.tileWide} onPress={onNavigateToRoutineManagement}>
            <View style={themedStyles.tileHeader}>
              <View style={themedStyles.tileIcon}><Ionicons name="list-outline" size={20} color={theme.colors.primary} /></View>
              <TouchableOpacity 
                style={themedStyles.smallButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigateToRoutineManagement();
                }}
              >
                <Text style={themedStyles.smallButtonText}>Abrir</Text>
              </TouchableOpacity>
            </View>
            <Text style={themedStyles.tileTitle}>Mis Rutinas</Text>
            <Text style={themedStyles.tileSubtitle}>Crea listas de tareas y hábitos diarios.</Text>
          </TouchableOpacity>

          {/* Estadísticas */}
          <TouchableOpacity style={themedStyles.tileWide} onPress={onNavigateToStatistics}>
            <View style={themedStyles.tileHeader}>
              <View style={themedStyles.tileIcon}><Ionicons name="analytics-outline" size={20} color={theme.colors.primary} /></View>
              <TouchableOpacity 
                style={themedStyles.smallButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigateToStatistics();
                }}
              >
                <Text style={themedStyles.smallButtonText}>Ver</Text>
              </TouchableOpacity>
            </View>
            <Text style={themedStyles.tileTitle}>Estadísticas</Text>
            <Text style={themedStyles.tileSubtitle}>Revisa tu progreso y productividad.</Text>
            <View style={themedStyles.statsGrid}>
              <View style={themedStyles.statItem}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <Text style={themedStyles.statNumber}>0</Text>
                <Text style={themedStyles.statLabel}>Horas Trabajadas</Text>
              </View>
              
              <View style={themedStyles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={themedStyles.statNumber}>{completedRoutines.length}</Text>
                <Text style={themedStyles.statLabel}>Rutinas Completadas</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Soporte / Ayuda */}
        <TouchableOpacity style={themedStyles.supportBar} onPress={onNavigateToHelp}>
          <View style={themedStyles.supportLeft}>
            <Ionicons name="help-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={themedStyles.supportText}>Necesitas Ayuda</Text>
          </View>
          <View style={themedStyles.supportButton}>
            <Text style={themedStyles.supportButtonText}>Abrir ▸</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={themedStyles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
          <Text style={themedStyles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

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

      {/* Modal de Chat con IA */}
      <AIChatModal
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        onAction={handleAIAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 16,
    paddingTop: 0,
  },
  welcomeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2a2a2a',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userDetails: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#FFD700',
    opacity: 0.8,
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#FFD700',
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  tileWide: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tileIcon: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  smallButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tileTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  tileSubtitle: {
    color: '#FFD700',
    opacity: 0.8,
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFD700',
    opacity: 0.8,
    textAlign: 'center',
  },
  supportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 8,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supportButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
