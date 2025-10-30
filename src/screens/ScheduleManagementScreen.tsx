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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useThemeForceUpdate } from '../hooks/useThemeForceUpdate';
import { useThemeUpdate } from '../hooks/useThemeUpdate';
import SupabaseScheduleService from '../services/SupabaseScheduleService';
import { Schedule, ScheduleCreateRequest } from '../interfaces/Schedule';
import { convertToHHMM, formatTime12Hour, formatDuration } from '../utils/timeUtils';
import ToastService from '../services/ToastService';

const DIAS_NOMBRES: { [key: number]: string } = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};

interface ScheduleManagementScreenProps {
  onNavigateBack: () => void;
}

export default function ScheduleManagementScreen({ onNavigateBack }: ScheduleManagementScreenProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { forceUpdate } = useThemeForceUpdate();
  const { theme: updatedTheme } = useThemeUpdate();
  const [scheduleService] = useState(SupabaseScheduleService);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    dia_semana: 1,
    hora_inicio: '09:00',
    hora_fin: '17:00',
    activo: true
  });

  const diasSemana = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' }
  ];

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const result = await scheduleService.getSchedules();
      
      if (result.success && result.schedules) {
        console.log('📥 Horarios cargados:', result.schedules);
        console.log('📥 Estados de los horarios:', result.schedules.map(s => ({ id: s.id, titulo: s.dia_nombre, activo: s.activo })));
        setSchedules(result.schedules);
        console.log('🔄 Estado local actualizado con', result.schedules.length, 'horarios');
      } else {
        console.log('Error cargando horarios:', result.message);
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  const validateForm = (): string | null => {
    if (!scheduleService.validateTimeFormat(formData.hora_inicio)) {
      return 'Formato de hora de inicio inválido (use HH:MM)';
    }
    
    if (!scheduleService.validateTimeFormat(formData.hora_fin)) {
      return 'Formato de hora de fin inválido (use HH:MM)';
    }
    
    if (!scheduleService.validateTimeRange(formData.hora_inicio, formData.hora_fin)) {
      return 'La hora de fin debe ser mayor que la hora de inicio';
    }
    
    // Validar que no haya solapamiento con otros horarios del mismo día
    const hasOverlap = checkScheduleOverlap(formData.dia_semana, formData.hora_inicio, formData.hora_fin);
    if (hasOverlap) {
      return 'Ya existe un horario en esa franja horaria para este día';
    }
    
    return null;
  };

  const checkScheduleOverlap = (diaSemana: number, horaInicio: string, horaFin: string): boolean => {
    // Obtener todos los horarios del mismo día (excluyendo el que se está editando)
    const horariosDelDia = schedules.filter(schedule => 
      schedule.dia_semana === diaSemana && 
      (!editingSchedule || schedule.id !== editingSchedule.id)
    );

    console.log('🔍 Verificando solapamiento:', {
      diaSemana,
      horaInicio,
      horaFin,
      horariosDelDia: horariosDelDia.map(h => ({
        id: h.id,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin
      }))
    });

    for (const horario of horariosDelDia) {
      const solapamiento = checkTimeOverlap(
        horaInicio, horaFin,
        horario.hora_inicio, horario.hora_fin
      );
      
      if (solapamiento) {
        console.log('❌ Solapamiento detectado:', {
          nuevo: { inicio: horaInicio, fin: horaFin },
          existente: { inicio: horario.hora_inicio, fin: horario.hora_fin }
        });
        return true;
      }
    }

    return false;
  };

  const checkTimeOverlap = (inicio1: string, fin1: string, inicio2: string, fin2: string): boolean => {
    // Convertir a minutos para facilitar la comparación
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const inicio1Min = timeToMinutes(inicio1);
    const fin1Min = timeToMinutes(fin1);
    const inicio2Min = timeToMinutes(inicio2);
    const fin2Min = timeToMinutes(fin2);

    // Verificar solapamiento: dos intervalos se solapan si uno empieza antes de que termine el otro
    const solapamiento = inicio1Min < fin2Min && fin1Min > inicio2Min;
    
    console.log('🕐 Comparando horarios:', {
      nuevo: { inicio: inicio1Min, fin: fin1Min },
      existente: { inicio: inicio2Min, fin: fin2Min },
      solapamiento
    });

    return solapamiento;
  };

  const handleCreateSchedule = async () => {
    const validationError = validateForm();
    if (validationError) {
      ToastService.error('Error de validación', validationError);
      return;
    }

    try {
      setActionLoading(true);
      
      const scheduleData: any = {
        dia_semana: formData.dia_semana,
        dia_nombre: DIAS_NOMBRES[formData.dia_semana] || 'Día',
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        activo: formData.activo
      };

      const result = await scheduleService.createSchedule(scheduleData);
      
      if (result.success) {
        ToastService.success('Éxito', 'Horario creado exitosamente');
        setShowModal(false);
        resetForm();
        loadSchedules();
      } else {
        ToastService.error('Error', result.message || 'No se pudo crear el horario');
      }
    } catch (error) {
      console.log('Error creando horario:', error);
      ToastService.error('Error', 'No se pudo crear el horario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    const validationError = validateForm();
    if (validationError) {
      ToastService.error('Error de validación', validationError);
      return;
    }

    try {
      setActionLoading(true);
      
      const result = await scheduleService.updateSchedule(editingSchedule.id, {
        dia_semana: formData.dia_semana,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        activo: formData.activo
      });
      
      if (result.success) {
        ToastService.success('Éxito', 'Horario actualizado exitosamente');
        setShowModal(false);
        setEditingSchedule(null);
        resetForm();
        loadSchedules();
      } else {
        ToastService.error('Error', result.message || 'No se pudo actualizar el horario');
      }
    } catch (error) {
      console.log('Error actualizando horario:', error);
      ToastService.error('Error', 'No se pudo actualizar el horario');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    Alert.alert(
      'Eliminar Horario',
      `¿Estás seguro de que quieres eliminar el horario de ${schedule.dia_nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              
              const result = await scheduleService.deleteSchedule(schedule.id);
              
              if (result.success) {
                ToastService.success('Éxito', 'Horario eliminado exitosamente');
                loadSchedules();
              } else {
                ToastService.error('Error', result.message || 'No se pudo eliminar el horario');
              }
            } catch (error) {
              console.log('Error eliminando horario:', error);
              ToastService.error('Error', 'No se pudo eliminar el horario');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    try {
      setActionLoading(true);
      
      const newActivo = !schedule.activo;
      console.log('🔄 Cambiando estado del horario:', {
        id: schedule.id,
        estadoActual: schedule.activo,
        nuevoEstado: newActivo
      });
      
      const result = await scheduleService.updateSchedule(schedule.id, {
        activo: newActivo
      });
      
      console.log('📥 Resultado de actualización:', result);
      
      if (result.success) {
        ToastService.success('Éxito', `Horario ${newActivo ? 'activado' : 'desactivado'} exitosamente`);
        console.log('🔄 Recargando horarios después de actualización...');
        await loadSchedules();
        console.log('✅ Horarios recargados');
      } else {
        ToastService.error('Error', result.message || 'No se pudo actualizar el horario');
      }
    } catch (error) {
      console.log('Error actualizando horario:', error);
      ToastService.error('Error', 'No se pudo actualizar el horario');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingSchedule(null);
    setShowModal(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      dia_semana: schedule.dia_semana,
      hora_inicio: convertTimeFormat(schedule.hora_inicio),
      hora_fin: convertTimeFormat(schedule.hora_fin),
      activo: schedule.activo
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      dia_semana: 1,
      hora_inicio: '09:00',
      hora_fin: '17:00',
      activo: true
    });
  };

  const getDiaNombre = (diaSemana: number) => {
    return diasSemana.find(dia => dia.value === diaSemana)?.label || 'Desconocido';
  };

  // Usar utilidades centralizadas
  const formatTime = formatTime12Hour;
  const convertTimeFormat = convertToHHMM;

  const groupSchedulesByDay = () => {
    const grouped: { [key: string]: Schedule[] } = {};
    
    schedules.forEach(schedule => {
      const diaNombre = schedule.dia_nombre;
      if (!grouped[diaNombre]) {
        grouped[diaNombre] = [];
      }
      grouped[diaNombre].push(schedule);
    });

    return grouped;
  };

  const themedStyles = useThemedStyles((theme) => {
    console.log('📅 ScheduleManagementScreen recalculando estilos:', { isDark: theme.isDark });
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
        marginBottom: 30,
        paddingTop: 20,
      },
      backButton: {
        padding: 8,
        marginRight: 16,
      },
      headerContent: {
        flex: 1,
      },
      headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 8,
      },
      headerSubtitle: {
        fontSize: 16,
        color: theme.colors.primary,
        opacity: 0.8,
      },
      addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: 24,
        gap: 8,
      },
      addButtonText: {
        color: theme.isDark ? '#000' : '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
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
      daySection: {
        marginBottom: 24,
      },
      dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      dayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
      },
      dayCount: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
      },
      scheduleCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      scheduleTime: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
      },
      scheduleStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.primary,
      },
      scheduleActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      actionButton: {
        padding: 8,
        borderRadius: 8,
      },
      editButton: {
        backgroundColor: theme.colors.info,
      },
      deleteButton: {
        backgroundColor: theme.colors.error,
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
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
      formPicker: {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
      },
      formSwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      switchLabel: {
        fontSize: 16,
        color: theme.colors.primary,
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
      form: {
        marginBottom: 20,
      },
      daySelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      },
      dayOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      dayOptionSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
      },
      dayOptionText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
      },
      dayOptionTextSelected: {
        color: theme.isDark ? '#000' : '#FFF',
      },
    });
  });

  if (loading) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={themedStyles.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  const groupedSchedules = groupSchedulesByDay();

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
          <View style={themedStyles.headerContent}>
            <Text style={themedStyles.headerTitle}>Gestión de Horarios</Text>
            <Text style={themedStyles.headerSubtitle}>
              {user?.nombre} {user?.apellido}
            </Text>
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity style={themedStyles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={theme.isDark ? '#000' : '#FFF'} />
          <Text style={themedStyles.addButtonText}>Agregar Horario</Text>
        </TouchableOpacity>

        {/* Schedules List */}
        {Object.keys(groupedSchedules).length === 0 ? (
          <View style={themedStyles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.primary} />
            <Text style={themedStyles.emptyTitle}>No hay horarios configurados</Text>
            <Text style={themedStyles.emptySubtitle}>
              Agrega tu primer horario de trabajo
            </Text>
          </View>
        ) : (
          Object.entries(groupedSchedules).map(([diaNombre, diaSchedules]) => (
            <View key={diaNombre} style={themedStyles.daySection}>
              <View style={themedStyles.dayHeader}>
                <Text style={themedStyles.dayTitle}>{diaNombre}</Text>
                <Text style={themedStyles.dayCount}>({diaSchedules.length})</Text>
              </View>
              {diaSchedules.map((schedule) => {
                console.log('🎨 Renderizando horario:', { id: schedule.id, titulo: schedule.dia_nombre, activo: schedule.activo });
                return (
                <View key={schedule.id} style={themedStyles.scheduleCard}>
                  <View style={themedStyles.scheduleHeader}>
                    <Text style={themedStyles.scheduleTime}>
                      {formatTime(schedule.hora_inicio)} - {formatTime(schedule.hora_fin)}
                    </Text>
                    <View style={themedStyles.scheduleStatus}>
                      <Text style={themedStyles.statusText}>
                        {schedule.activo === true ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                  <View style={themedStyles.scheduleActions}>
                    <TouchableOpacity 
                      style={[themedStyles.actionButton, themedStyles.editButton]}
                      onPress={() => openEditModal(schedule)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="pencil" size={16} color={theme.isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[themedStyles.actionButton, themedStyles.deleteButton]}
                      onPress={() => handleDeleteSchedule(schedule)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="trash" size={16} color={theme.isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                  </View>
                </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal para crear/editar horario */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>
                {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
              </Text>
              <TouchableOpacity style={themedStyles.closeButton} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={themedStyles.form}>
              {/* Día de la semana */}
              <View style={themedStyles.formGroup}>
                <Text style={themedStyles.formLabel}>Día de la semana</Text>
                <View style={themedStyles.daySelector}>
                  {diasSemana.map((dia) => (
                    <TouchableOpacity
                      key={dia.value}
                      style={[
                        themedStyles.dayOption,
                        formData.dia_semana === dia.value && themedStyles.dayOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, dia_semana: dia.value })}
                    >
                      <Text style={[
                        themedStyles.dayOptionText,
                        formData.dia_semana === dia.value && themedStyles.dayOptionTextSelected
                      ]}>
                        {dia.label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Hora de inicio */}
              <View style={themedStyles.formGroup}>
                <Text style={themedStyles.formLabel}>Hora de inicio</Text>
                <TextInput
                  style={themedStyles.formInput}
                  value={formData.hora_inicio}
                  onChangeText={(text) => setFormData({ ...formData, hora_inicio: text })}
                  placeholder="09:00"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              {/* Hora de fin */}
              <View style={themedStyles.formGroup}>
                <Text style={themedStyles.formLabel}>Hora de fin</Text>
                <TextInput
                  style={themedStyles.formInput}
                  value={formData.hora_fin}
                  onChangeText={(text) => setFormData({ ...formData, hora_fin: text })}
                  placeholder="17:00"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              {/* Estado activo */}
              <View style={themedStyles.formGroup}>
                <Text style={themedStyles.formLabel}>Estado del horario</Text>
                <View style={themedStyles.formSwitch}>
                  <Text style={themedStyles.switchLabel}>
                    {formData.activo === true ? 'Activo' : 'Inactivo'}
                  </Text>
                  <Switch
                    value={formData.activo === true}
                    onValueChange={(value) => setFormData({ ...formData, activo: value })}
                    trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                    thumbColor={formData.activo === true ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>
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
                onPress={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={theme.isDark ? '#000' : '#FFF'} />
                ) : (
                  <Text style={themedStyles.saveButtonText}>
                    {editingSchedule ? 'Actualizar' : 'Crear'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

