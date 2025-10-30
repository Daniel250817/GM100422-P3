import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useThemeForceUpdate } from '../hooks/useThemeForceUpdate';
import { useThemeUpdate } from '../hooks/useThemeUpdate';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import SupabaseRoutineService from '../services/SupabaseRoutineService';
import { Routine } from '../interfaces/Routine';
import { formatDuration } from '../utils/timeUtils';
import ToastService from '../services/ToastService';

interface RoutineManagementScreenProps {
  onNavigateBack: () => void;
}

export default function RoutineManagementScreen({ onNavigateBack }: RoutineManagementScreenProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { forceUpdate } = useThemeForceUpdate();
  const { theme: updatedTheme } = useThemeUpdate();
  const [routineService] = useState(SupabaseRoutineService);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [routineToComplete, setRoutineToComplete] = useState<Routine | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: ''
  });

  useEffect(() => {
    loadRoutines();
  }, []);

  // Debug: Log cuando cambie el estado del modal
  useEffect(() => {
    console.log('🔴 showCompleteModal cambió a:', showCompleteModal);
    console.log('🔴 routineToComplete:', routineToComplete?.titulo);
  }, [showCompleteModal, routineToComplete]);

  // Debug: Log rutinas cuando cambien
  useEffect(() => {
    console.log('🔍 Rutinas actualizadas:', routines.length, routines);
  }, [routines]);

  // Efecto para manejar el cronómetro
  useEffect(() => {
    if (activeRoutine && activeRoutine.activa === true && activeRoutine.tiempo_inicio) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [activeRoutine]);

  const loadRoutines = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando rutinas...');
      
      const [routinesResult, activeResult] = await Promise.all([
        routineService.getRoutines(),
        routineService.getActiveRoutine()
      ]);

      console.log('📥 Resultado rutinas:', routinesResult);
      console.log('📥 Resultado activa:', activeResult);

      if (routinesResult.success) {
        setRoutines(routinesResult.routines || []);
        console.log('✅ Rutinas cargadas:', routinesResult.routines?.length || 0);
        console.log('✅ Datos de rutinas:', routinesResult.routines);
      } else {
        console.log('❌ Error cargando rutinas:', routinesResult.message);
      }

      if (activeResult.success && activeResult.routine) {
        setActiveRoutine(activeResult.routine);
        console.log('✅ Rutina activa encontrada:', activeResult.routine.id);
      } else {
        setActiveRoutine(null);
        console.log('ℹ️ No hay rutina activa');
      }
    } catch (error) {
      console.log('❌ Error cargando rutinas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  // Funciones del cronómetro
  const startTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const interval = setInterval(() => {
      if (activeRoutine && activeRoutine.tiempo_inicio) {
        const startTime = new Date(activeRoutine.tiempo_inicio);
        const currentTime = new Date();
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setElapsedTime(0);
  };

  const getTotalTime = (routine: Routine): number => {
    // Si la rutina está activa, calcular tiempo desde tiempo_inicio hasta ahora
    if (routine.activa && routine.tiempo_inicio) {
      const tiempoInicio = new Date(routine.tiempo_inicio);
      const tiempoActual = new Date();
      return Math.floor((tiempoActual.getTime() - tiempoInicio.getTime()) / 1000);
    }
    // Si no está activa pero tiene tiempo_inicio, calcular tiempo desde tiempo_inicio hasta updated_at
    if (!routine.activa && routine.tiempo_inicio) {
      const tiempoInicio = new Date(routine.tiempo_inicio);
      const tiempoFinal = new Date(routine.updated_at);
      return Math.floor((tiempoFinal.getTime() - tiempoInicio.getTime()) / 1000);
    }
    return 0;
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openCreateModal = () => {
    setFormData({
      titulo: '',
      descripcion: ''
    });
    setEditingRoutine(null);
    setShowModal(true);
  };

  const openEditModal = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormData({
      titulo: routine.titulo,
      descripcion: routine.descripcion
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: ''
    });
  };

  const validateForm = () => {
    if (!formData.titulo.trim()) {
      ToastService.error('Error', 'El título es requerido');
      return false;
    }
    return true;
  };

  const handleCreateRoutine = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading(true);
      
      const result = await routineService.createRoutine(formData);
      
      if (result.success) {
        ToastService.success('Éxito', 'Rutina creada exitosamente');
        setShowModal(false);
        resetForm();
        loadRoutines();
      } else {
        ToastService.error('Error', result.message || 'No se pudo crear la rutina');
      }
    } catch (error) {
      console.log('Error creando rutina:', error);
      ToastService.error('Error', 'No se pudo crear la rutina');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoutine = async () => {
    if (!validateForm() || !editingRoutine) return;

    try {
      setActionLoading(true);
      
      const result = await routineService.updateRoutine(editingRoutine.id, formData);
      
      if (result.success) {
        ToastService.success('Éxito', 'Rutina actualizada exitosamente');
        setShowModal(false);
        resetForm();
        loadRoutines();
      } else {
        ToastService.error('Error', result.message || 'No se pudo actualizar la rutina');
      }
    } catch (error) {
      console.log('Error actualizando rutina:', error);
      ToastService.error('Error', 'No se pudo actualizar la rutina');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Estás seguro de que quieres eliminar la rutina "${routine.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              
              const result = await routineService.deleteRoutine(routine.id);
              
              if (result.success) {
                Alert.alert('Éxito', 'Rutina eliminada exitosamente');
                loadRoutines();
              } else {
                Alert.alert('Error', result.message || 'No se pudo eliminar la rutina');
              }
            } catch (error) {
              console.log('Error eliminando rutina:', error);
              Alert.alert('Error', 'No se pudo eliminar la rutina');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleStartRoutine = async (routine: Routine) => {
    if (activeRoutine) {
      ToastService.warning('Rutina Activa', 'Ya tienes una rutina activa. Detén la rutina actual antes de iniciar otra.');
      return;
    }

    try {
      setActionLoading(true);
      
      const result = await routineService.startRoutine(routine.id);
      
      if (result.success) {
        ToastService.success('Éxito', 'Rutina iniciada exitosamente');
        await loadRoutines(); // Recargar para obtener la rutina activa actualizada
      } else {
        ToastService.error('Error', result.message || 'No se pudo iniciar la rutina');
      }
    } catch (error) {
      console.log('Error iniciando rutina:', error);
      ToastService.error('Error', 'No se pudo iniciar la rutina');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopRoutine = async (routine: Routine) => {
    try {
      setActionLoading(true);
      
      const result = await routineService.stopRoutine(routine.id);
      
      if (result.success) {
        ToastService.success('Éxito', `Rutina detenida correctamente.`);
        loadRoutines();
      } else {
        ToastService.error('Error', result.message || 'No se pudo detener la rutina');
      }
    } catch (error) {
      console.log('Error deteniendo rutina:', error);
      ToastService.error('Error', 'No se pudo detener la rutina');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRoutine = (routine: Routine) => {
    console.log('🔴 handleCompleteRoutine llamado con rutina:', routine?.titulo);
    setRoutineToComplete(routine);
    setShowCompleteModal(true);
    console.log('🔴 Estado actualizado: showCompleteModal = true, routineToComplete =', routine?.titulo);
  };

  const confirmCompleteRoutine = async () => {
    if (!routineToComplete) return;
    
            try {
              setActionLoading(true);
              
              // Primero detener la rutina si está activa
      if (routineToComplete.activa === true) {
        const stopResult = await routineService.stopRoutine(routineToComplete.id);
                if (!stopResult.success) {
                  ToastService.error('Error', 'No se pudo detener la rutina');
                  return;
                }
              }
              
              // Luego completar la rutina
      const result = await routineService.completeRoutine(routineToComplete.id);
              
              if (result.success) {
                ToastService.success('Éxito', 'Rutina finalizada exitosamente');
                loadRoutines();
              } else {
                ToastService.error('Error', result.message || 'No se pudo finalizar la rutina');
              }
            } catch (error) {
              console.log('Error finalizando rutina:', error);
              ToastService.error('Error', 'No se pudo finalizar la rutina');
            } finally {
              setActionLoading(false);
      setShowCompleteModal(false);
      setRoutineToComplete(null);
    }
  };

  const cancelCompleteRoutine = () => {
    setShowCompleteModal(false);
    setRoutineToComplete(null);
  };

  const getRoutineStatus = (routine: Routine) => {
    if (routine.completada === true) {
      return { text: 'Finalizada', color: theme.isDark ? '#4CAF50' : '#FF3B30' };
    }
    if (routine.activa === true) {
      return { text: 'En Proceso', color: theme.isDark ? '#FFD700' : '#007AFF' };
    }
    return { text: 'Pendiente', color: theme.isDark ? '#666' : '#8E8E93' };
  };

  const themedStyles = useThemedStyles((theme) => {
    console.log('📋 RoutineManagementScreen recalculando estilos:', { isDark: theme.isDark });
    return StyleSheet.create({
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
        color: theme.colors.primary,
        fontSize: 16,
        marginTop: 16,
      },
      scrollContent: {
        flexGrow: 1,
        padding: 20,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingTop: 20,
      },
      backButton: {
        padding: 8,
      },
      headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        flex: 1,
        textAlign: 'center',
      },
      addButton: {
        padding: 8,
      },
      activeRoutineCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
      },
      activeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginLeft: 12,
      },
      activeRoutineTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 8,
      },
      activeRoutineDesc: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
        marginBottom: 16,
      },
      timerSection: {
        alignItems: 'center',
        marginBottom: 20,
      },
      timerDisplay: {
        alignItems: 'center',
      },
      timerLabel: {
        fontSize: 12,
        color: theme.colors.primary,
        opacity: 0.8,
        marginBottom: 4,
        textAlign: 'center',
      },
      timerValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
      },
      mainTimerValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 8,
        textAlign: 'center',
      },
      activeActions: {
        flexDirection: 'row',
        gap: 12,
      },
      stopButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.error,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
      },
      stopButtonText: {
        color: theme.isDark ? '#000' : '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
      },
      noActiveRoutine: {
        alignItems: 'center',
        paddingVertical: 20,
      },
      noActiveText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
        opacity: 0.5,
        marginBottom: 8,
      },
      noActiveDesc: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
      },
      routinesList: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 16,
      },
      routineCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      routineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      routineInfo: {
        flex: 1,
        flexDirection: 'column',
      },
      routineTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
      },
      statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
      },
      routineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.primary,
      },
      routineDesc: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
        marginBottom: 12,
      },
      routineActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      },
      actionButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
      },
      startButton: {
        backgroundColor: theme.colors.success,
      },
      editButton: {
        backgroundColor: theme.isDark ? '#FFD700' : '#FFD700',
      },
      deleteButton: {
        backgroundColor: theme.isDark ? '#FF3B30' : '#FF3B30',
      },
      actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.isDark ? '#000' : '#FFF',
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
      },
      closeButton: {
        padding: 8,
      },
      formGroup: {
        marginBottom: 16,
      },
      formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 8,
      },
      formInput: {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: theme.colors.text,
      },
      modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
      },
      cancelButton: {
        flex: 1,
        backgroundColor: theme.colors.textSecondary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
      },
      cancelButtonText: {
        color: theme.isDark ? '#000' : '#FFF',
        fontSize: 16,
        fontWeight: '600',
      },
      saveButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
      },
      saveButtonText: {
        color: theme.isDark ? '#000' : '#FFF',
        fontSize: 16,
        fontWeight: '600',
      },
      emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
      },
      emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginTop: 16,
        marginBottom: 8,
      },
      emptySubtitle: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
        textAlign: 'center',
      },
      routineStats: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      },
      routineTime: {
        fontSize: 12,
        color: theme.colors.primary,
        opacity: 0.8,
      },
      disabledButton: {
        opacity: 0.5,
        backgroundColor: theme.colors.textSecondary,
      },
      startStopActions: {
        marginTop: 12,
        marginBottom: 8,
      },
      startStopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
      },
      startStopButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.isDark ? '#000' : '#FFF',
      },
    });
  });

  if (loading) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={themedStyles.loadingText}>Cargando rutinas...</Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
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
        {/* Header */}
        <View style={themedStyles.header}>
          <TouchableOpacity style={themedStyles.backButton} onPress={onNavigateBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={themedStyles.headerTitle}>Mis Rutinas</Text>
          <TouchableOpacity style={themedStyles.addButton} onPress={openCreateModal}>
            <Ionicons name="add-circle-outline" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Contador de Rutina Activa */}
        <View style={themedStyles.activeRoutineCard}>
          <View style={themedStyles.activeHeader}>
            <Ionicons name="play-circle" size={24} color={theme.colors.primary} />
            <Text style={themedStyles.activeTitle}>
              {activeRoutine ? 'Rutina Activa' : 'Rutina No Iniciadas'}
            </Text>
          </View>
          
        
          {activeRoutine?.descripcion && (
            <Text style={themedStyles.activeRoutineDesc}>{activeRoutine.descripcion}</Text>
          )}
          
          {/* Contador principal */}
          <View style={themedStyles.timerSection}>
            <Text style={themedStyles.mainTimerValue}>
              {activeRoutine ? formatElapsedTime(elapsedTime) : '00:00:00'}
            </Text>
            <Text style={themedStyles.timerLabel}>
              {activeRoutine ? 'Tiempo transcurrido' : 'Selecciona una rutina para comenzar'}
            </Text>
              </View>

          {activeRoutine && (
            <View style={themedStyles.activeActions}>
                <TouchableOpacity 
                style={themedStyles.stopButton}
                  onPress={() => handleCompleteRoutine(activeRoutine)}
                  disabled={actionLoading}
                >
                <Ionicons name="stop" size={20} color={theme.isDark ? '#000' : '#FFF'} />
                <Text style={themedStyles.stopButtonText}>Finalizar</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lista de Rutinas */}
        <View style={themedStyles.routinesList}>
          <Text style={themedStyles.sectionTitle}>Mis Rutinas ({routines.length})</Text>
          {(() => {
            // Mostrar todas las rutinas, no filtrar por completada
            const filteredRoutines = routines;
            console.log('🔍 Rutinas a mostrar:', filteredRoutines.length, filteredRoutines);
            console.log('🔍 Detalles de cada rutina:');
            filteredRoutines.forEach((routine, index) => {
              console.log(`  Rutina ${index + 1}:`, {
                id: routine.id,
                titulo: routine.titulo,
                activa: routine.activa,
                completada: routine.completada
              });
            });
            
            // if (filteredRoutines.length === 0) {
            //   return (
            //     <View style={themedStyles.emptyState}>
            //       {/* <Text style={[themedStyles.emptyTitle, {fontSize: 14}]}>
            //         No hay rutinas para mostrar
            //       </Text> */}
            //       <Text style={[themedStyles.emptySubtitle, {fontSize: 12, marginTop: 5}]}>
            //         Total rutinas: {routines.length}
            //       </Text>
            //     </View>
            //   );
            // }
            
            return filteredRoutines.map((routine) => {
            const status = getRoutineStatus(routine);
            const isActive = routine.activa === true;
            
            return (
              <View key={routine.id} style={themedStyles.routineCard}>
                <View style={themedStyles.routineHeader}>
                  <View style={themedStyles.routineInfo}>
                    <Text style={themedStyles.routineTitle}>{routine.titulo}</Text>
                    <View style={[themedStyles.statusBadge, { backgroundColor: status.color }]}>
                      <Text style={themedStyles.statusBadgeText}>{status.text}</Text>
                    </View>
                  </View>
                  <View style={themedStyles.routineActions}>
                    <TouchableOpacity 
                      style={[themedStyles.actionButton, themedStyles.editButton]}
                      onPress={() => openEditModal(routine)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="create" size={16} color={theme.isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[themedStyles.actionButton, themedStyles.deleteButton]}
                      onPress={() => handleDeleteRoutine(routine)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="trash" size={16} color={theme.isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                  </View>
                </View>
                {routine.descripcion && (
                  <Text style={themedStyles.routineDesc}>{routine.descripcion}</Text>
                )}
                
                {/* Botones de acción principales - Solo para rutinas no completadas */}
                {routine.completada !== true && (
                  <View style={themedStyles.startStopActions}>
                    {routine.activa === true ? (
                      <TouchableOpacity 
                        style={[themedStyles.startStopButton, themedStyles.stopButton]}
                        onPress={() => handleCompleteRoutine(routine)}
                        disabled={actionLoading}
                      >
                        <Ionicons name="stop" size={20} color={theme.isDark ? '#000' : '#FFF'} />
                        <Text style={themedStyles.startStopButtonText}>Finalizar</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[themedStyles.startStopButton, themedStyles.startButton, activeRoutine !== null && themedStyles.disabledButton]}
                        onPress={() => handleStartRoutine(routine)}
                        disabled={actionLoading || activeRoutine !== null}
                      >
                        <Ionicons name="play" size={20} color={theme.isDark ? '#000' : '#FFF'} />
                        <Text style={themedStyles.startStopButtonText}>
                          {activeRoutine !== null ? 'Otra Activa' : 'Iniciar'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                <View style={themedStyles.routineStats}>
                  <Text style={themedStyles.routineTime}>
                    Tiempo total: {formatDuration(getTotalTime(routine))}
                  </Text>
                </View>
              </View>
            );
            });
          })()}
        </View>

        {routines.length === 0 && (
          <View style={themedStyles.emptyState}>
            <Ionicons name="list-outline" size={64} color={theme.colors.primary} />
            <Text style={themedStyles.emptyTitle}>No hay rutinas</Text>
            <Text style={themedStyles.emptySubtitle}>Crea tu primera rutina para comenzar</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para crear/editar rutina */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>
                {editingRoutine ? 'Editar Rutina' : 'Nueva Rutina'}
              </Text>
              <TouchableOpacity 
                style={themedStyles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={themedStyles.formGroup}>
              <Text style={themedStyles.formLabel}>Título *</Text>
              <TextInput
                style={themedStyles.formInput}
                value={formData.titulo}
                onChangeText={(text) => setFormData({ ...formData, titulo: text })}
                placeholder="Ej: Ejercicio matutino"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={themedStyles.formLabel}>Descripción</Text>
              <TextInput
                style={[themedStyles.formInput, { height: 80, textAlignVertical: 'top' }]}
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                placeholder="Descripción opcional de la rutina"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={themedStyles.modalActions}>
              <TouchableOpacity 
                style={themedStyles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={themedStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={themedStyles.saveButton}
                onPress={editingRoutine ? handleUpdateRoutine : handleCreateRoutine}
                disabled={actionLoading}
              >
                <Text style={themedStyles.saveButtonText}>
                  {actionLoading ? 'Guardando...' : (editingRoutine ? 'Actualizar' : 'Crear')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación para Finalizar Rutina */}
      <ConfirmationModal
        visible={showCompleteModal}
        title="Finalizar Rutina"
        message={`¿Estás seguro de que quieres finalizar "${routineToComplete?.titulo}"?`}
        confirmText="Finalizar"
        cancelText="Cancelar"
        confirmColor={theme.colors.error}
        cancelColor={theme.colors.textSecondary}
        icon="checkmark-circle-outline"
        loading={actionLoading}
        onConfirm={confirmCompleteRoutine}
        onCancel={cancelCompleteRoutine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4, // 20 - 16 = 4 (compensar el padding del scrollContent)
    paddingTop: 34, // 50 - 16 = 34 (compensar el padding del scrollContent)
    paddingBottom: 4, // 20 - 16 = 4 (compensar el padding del scrollContent)
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  activeRoutineCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  activeRoutineTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeRoutineDesc: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
  },
  timerSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  timerDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  activeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  noActiveRoutine: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noActiveText: {
    fontSize: 48,
    color: '#FFD700',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  noActiveDesc: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  routinesList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
    marginLeft: 4,
  },
  routineCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routineInfo: {
    flex: 1,
  },
  routineTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonsContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  startButtonContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  completeButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#FFD700',
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 6,
  },
  routineDesc: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
  },
  routineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineTime: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
