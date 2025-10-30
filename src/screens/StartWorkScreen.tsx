import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useThemeForceUpdate } from '../hooks/useThemeForceUpdate';
import { useThemeUpdate } from '../hooks/useThemeUpdate';
import SupabaseSessionService from '../services/SupabaseSessionService';
import SupabaseScheduleService from '../services/SupabaseScheduleService';
import { Session } from '../interfaces/Session';
import { Schedule } from '../interfaces/Schedule';
import { formatTime12Hour, formatDuration, formatDurationDetailed } from '../utils/timeUtils';
import ToastService from '../services/ToastService';

interface StartWorkScreenProps {
  onNavigateBack: () => void;
}

export default function StartWorkScreen({ onNavigateBack }: StartWorkScreenProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { forceUpdate } = useThemeForceUpdate();
  const { theme: updatedTheme } = useThemeUpdate();
  const [sessionService] = useState(SupabaseSessionService);
  const [scheduleService] = useState(SupabaseScheduleService);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [scheduleVerification, setScheduleVerification] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  // Cronómetro en tiempo real para sesión activa y verificación de horario
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSession && activeSession.activa) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    } else if (!activeSession && todaySchedule) {
      // Verificar horario cada minuto si no hay sesión activa pero hay horario
      interval = setInterval(async () => {
        setCurrentTime(new Date());
        const result = await scheduleService.verifySchedulePermission();
        if (result.success) {
          setScheduleVerification(result);
        }
      }, 60000); // Verificar cada minuto
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeSession, todaySchedule]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      // Cargar sesión activa, verificación de horarios, horario del día y sesiones del día en paralelo
      const [sessionResult, scheduleResult, schedulesResult, todaySessionsResult] = await Promise.all([
        sessionService.getActiveSession(),
        scheduleService.verifySchedulePermission(),
        scheduleService.getSchedules(),
        sessionService.getTodaySessions()
      ]);
      
      if (sessionResult.success) {
        setActiveSession(sessionResult.session || null);
      }
      
      if (scheduleResult.success) {
        setScheduleVerification(scheduleResult);
      }

      // Obtener horario del día actual
      if (schedulesResult.success && schedulesResult.schedules) {
        const todaySchedule = schedulesResult.schedules.find(
          s => s.dia_semana === dayOfWeek && s.activo === true
        );
        setTodaySchedule(todaySchedule || null);
      } else {
        setTodaySchedule(null);
      }

      if (todaySessionsResult.success) {
        console.log('📥 Sesiones del día cargadas:', todaySessionsResult.sessions?.length || 0);
        console.log('📥 Datos de sesiones:', todaySessionsResult.sessions);
        setTodaySessions(todaySessionsResult.sessions || []);
        
        // Recalcular duraciones de sesiones que no tengan duración
        console.log('🔄 Iniciando recálculo de duraciones...');
        const recalculateResult = await sessionService.recalculateSessionDurations();
        console.log('📊 Resultado del recálculo:', recalculateResult);
        
        if (recalculateResult.success && recalculateResult.updated && recalculateResult.updated > 0) {
          console.log(`✅ ${recalculateResult.updated} sesiones recalculadas`);
          // Recargar las sesiones después del recálculo
          const updatedSessionsResult = await sessionService.getTodaySessions();
          if (updatedSessionsResult.success) {
            console.log('📥 Sesiones recargadas después del recálculo:', updatedSessionsResult.sessions);
            setTodaySessions(updatedSessionsResult.sessions || []);
          }
        } else {
          console.log('ℹ️ No se actualizaron sesiones o no había sesiones para recalcular');
        }
      } else {
        console.log('❌ Error cargando sesiones del día:', todaySessionsResult.message);
      }
    } catch (error) {
      console.log('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartSession = async () => {
    try {
      setActionLoading(true);
      
      // Verificar horarios antes de iniciar
      if (scheduleVerification && !scheduleVerification.canStart) {
        ToastService.warning('Fuera de Horario', scheduleVerification.message);
        return;
      }
      
      const result = await sessionService.startSession({ notas: '' });
      
      if (result.success && result.session) {
        setActiveSession(result.session);
        ToastService.success(
          'Jornada Iniciada',
          'Tu sesión de trabajo ha comenzado. ¡Que tengas un buen día!'
        );
        // Recargar las sesiones del día para mostrar la nueva sesión
        await loadData();
      } else {
        ToastService.error('Error', result.message || 'No se pudo iniciar la sesión');
      }
    } catch (error) {
      console.log('Error iniciando sesión:', error);
      ToastService.error('Error', 'No se pudo iniciar la sesión');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      setActionLoading(true);
      
      const result = await sessionService.endSession({
        sesionId: activeSession.id
      });
      
      if (result.success) {
        setActiveSession(null);
        ToastService.success(
          'Jornada Terminada',
          'Tu sesión ha terminado correctamente.'
        );
        // Recargar las sesiones del día para mostrar la sesión actualizada
        await loadData();
      } else {
        ToastService.error('Error', result.message || 'No se pudo terminar la sesión');
      }
    } catch (error) {
      console.log('Error terminando sesión:', error);
      ToastService.error('Error', 'No se pudo terminar la sesión');
    } finally {
      setActionLoading(false);
    }
  };

  const getCurrentDuration = (): string => {
    if (!activeSession) return '0 min';
    
    const startTime = new Date(activeSession.hora_entrada);
    const durationMs = currentTime.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    
    return formatDurationDetailed(durationSeconds);
  };

  const getCurrentDurationDetailed = (): string => {
    if (!activeSession) return '00:00:00';
    
    const startTime = new Date(activeSession.hora_entrada);
    const durationMs = currentTime.getTime() - startTime.getTime();
    const totalSeconds = Math.floor(durationMs / 1000);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Usar utilidades centralizadas
  const formatTime = formatTime12Hour;

  // Formatear fecha con día de la semana y fecha
  const formatSessionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = daysOfWeek[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${dayName} ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Formatear hora en formato 12 horas
  const formatSessionTime = (dateString: string): string => {
    const date = new Date(dateString);
    const timeString = date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return formatTime12Hour(timeString);
  };

  const getSessionDuration = (session: Session): string => {
    if (session.activa) {
      // Si la sesión está activa, calcular desde hora_entrada hasta tiempo actual
      const startTime = new Date(session.hora_entrada);
      const durationMs = currentTime.getTime() - startTime.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);
      return formatDurationDetailed(durationSeconds);
    } else if (session.hora_salida && session.hora_entrada) {
      // Siempre calcular desde timestamps cuando están disponibles para mayor precisión
      // Esto asegura que los segundos se calculen correctamente
      const startTime = new Date(session.hora_entrada);
      const endTime = new Date(session.hora_salida);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);
      return formatDurationDetailed(durationSeconds);
    } else if (session.duracion_minutos !== null && session.duracion_minutos !== undefined) {
      // Solo usar duracion_minutos como fallback si no hay timestamps
      return formatDurationDetailed(session.duracion_minutos * 60);
    }
    return '0s';
  };

  const getSessionStatus = (session: Session) => {
    if (session.activa) {
      return { text: 'En Proceso', color: theme.colors.success };
    }
    return { text: 'Finalizada', color: theme.colors.textSecondary };
  };

  const getStatusInfo = () => {
    if (activeSession) {
      return {
        title: 'Sesión Activa',
        subtitle: `Iniciada: ${new Date(activeSession.hora_entrada).toLocaleString('es-ES')}`,
        duration: getCurrentDuration(),
        status: 'active',
        canStart: false,
        canEnd: true
      };
    }

    // Verificar si hay horario asignado
    if (!todaySchedule) {
      return {
        title: 'Sin Horario Asignado',
        subtitle: 'No tienes horario asignado para este día',
        duration: null,
        status: 'restricted',
        canStart: false,
        canEnd: false
      };
    }

    // Verificar si puede iniciar según horarios
    const canStart = scheduleVerification?.canStart ?? false;
    const statusMessage = scheduleVerification?.message || 'No es tu horario de trabajo';
    
    return {
      title: canStart ? 'Iniciar Jornada' : 'Fuera de Horario',
      subtitle: canStart ? 'Puedes iniciar tu jornada' : statusMessage,
      duration: null,
      status: canStart ? 'inactive' : 'restricted',
      canStart: canStart,
      canEnd: false
    };
  };

  const statusInfo = getStatusInfo();

  const themedStyles = useThemedStyles((theme) => {
    console.log('🏢 StartWorkScreen recalculando estilos:', { isDark: theme.isDark });
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
      statusCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
      },
      statusIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      },
      statusInfo: {
        flex: 1,
      },
      statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
      },
      statusSubtitle: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
        marginBottom: 8,
      },
      durationText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.success,
      },
      actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
      },
      startButton: {
        backgroundColor: theme.colors.success,
      },
      endButton: {
        backgroundColor: theme.colors.error,
      },
      restrictedButton: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.6,
      },
      actionButtonText: {
        color: theme.isDark ? '#000' : '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
      },
      infoGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
      },
      infoCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginTop: 8,
        marginBottom: 4,
      },
      infoText: {
        fontSize: 12,
        color: theme.colors.primary,
        opacity: 0.8,
        textAlign: 'center',
      },
      sessionsSection: {
        marginTop: 8,
      },
      dayGroup: {
        marginBottom: 24,
      },
      sessionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
      },
      sessionItem: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      sessionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      },
      sessionInfo: {
        flex: 1,
      },
      sessionTimes: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
      },
      sessionTime: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.primary,
        opacity: 0.85,
      },
      sessionDuration: {
        fontSize: 13,
        color: theme.colors.primary,
        opacity: 0.75,
        marginBottom: 4,
      },
      sessionStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 60,
      },
      sessionStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
      },
      emptySessions: {
        alignItems: 'center',
        paddingVertical: 20,
      },
      emptySessionsText: {
        fontSize: 14,
        color: theme.colors.primary,
        opacity: 0.8,
        textAlign: 'center',
      },
      scheduleWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.colors.warning,
        gap: 8,
      },
      scheduleWarningText: {
        fontSize: 14,
        color: theme.colors.warning,
        textAlign: 'center',
      },
    });
  });

  if (loading) {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={themedStyles.loadingText}>Cargando...</Text>
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
          <View style={themedStyles.headerContent}>
            <Text style={themedStyles.headerTitle}>Jornada de Trabajo</Text>
            <Text style={themedStyles.headerSubtitle}>
              {user?.nombreCompleto || 'Usuario'}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={themedStyles.statusCard}>
          <View style={themedStyles.statusHeader}>
            <View style={[
              themedStyles.statusIcon,
              { backgroundColor: statusInfo.status === 'active' ? theme.colors.success : theme.colors.primary }
            ]}>
              <Ionicons 
                name={statusInfo.status === 'active' ? 'time' : 'play-circle'} 
                size={32} 
                color={theme.isDark ? '#000' : '#FFF'} 
              />
            </View>
            <View style={themedStyles.statusInfo}>
              <Text style={themedStyles.statusTitle}>{statusInfo.title}</Text>
              <Text style={themedStyles.statusSubtitle}>{statusInfo.subtitle}</Text>
              {statusInfo.duration && (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <Text style={[themedStyles.durationText, { fontSize: 24, fontFamily: 'monospace' }]}>
                    {getCurrentDurationDetailed()}
                  </Text>
                  <Text style={[themedStyles.durationText, { fontSize: 14, opacity: 0.8 }]}>
                    Duración: {statusInfo.duration}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              themedStyles.actionButton,
              statusInfo.status === 'active' 
                ? themedStyles.endButton 
                : statusInfo.status === 'restricted' || !statusInfo.canStart
                ? themedStyles.restrictedButton
                : themedStyles.startButton
            ]}
            onPress={statusInfo.status === 'active' ? handleEndSession : handleStartSession}
            disabled={
              actionLoading || 
              statusInfo.status === 'restricted' || 
              (statusInfo.status === 'active' ? !statusInfo.canEnd : !statusInfo.canStart)
            }
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={theme.isDark ? '#000' : '#FFF'} />
            ) : (
              <>
                <Ionicons 
                  name={statusInfo.status === 'active' ? 'stop' : 'play'} 
                  size={20} 
                  color={theme.isDark ? '#000' : '#FFF'} 
                />
                <Text style={themedStyles.actionButtonText}>
                  {statusInfo.status === 'active' 
                    ? 'Terminar Jornada' 
                    : statusInfo.status === 'restricted' && !todaySchedule
                    ? 'Sin Horario'
                    : statusInfo.status === 'restricted' && todaySchedule
                    ? 'Fuera de Horario'
                    : 'Iniciar Jornada'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View style={themedStyles.infoGrid}>
          <View style={themedStyles.infoCard}>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <Text style={themedStyles.infoTitle}>Hora Inicio</Text>
            <Text style={themedStyles.infoText}>
              {todaySchedule 
                ? formatTime12Hour(todaySchedule.hora_inicio)
                : 'No asignado'}
            </Text>
          </View>

          <View style={themedStyles.infoCard}>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <Text style={themedStyles.infoTitle}>Hora Fin</Text>
            <Text style={themedStyles.infoText}>
              {todaySchedule 
                ? formatTime12Hour(todaySchedule.hora_fin)
                : 'No asignado'}
            </Text>
          </View>
        </View>
        
        {!todaySchedule && (
          <View style={themedStyles.scheduleWarning}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
            <Text style={themedStyles.scheduleWarningText}>
              No se tiene horario asignado para este día
            </Text>
          </View>
        )}

        {/* Sesiones Agrupadas por Día */}
        <View style={themedStyles.sessionsSection}>
          {(() => {
            // Agrupar sesiones por día
            const groupedSessions: { [key: string]: Session[] } = {};
            
            todaySessions.forEach((session) => {
              const sessionDate = formatSessionDate(session.hora_entrada);
              if (!groupedSessions[sessionDate]) {
                groupedSessions[sessionDate] = [];
              }
              groupedSessions[sessionDate].push(session);
            });
            
            // Ordenar fechas de más reciente a más antigua
            const sortedDates = Object.keys(groupedSessions).sort((a, b) => {
              const dateA = new Date(a.split(' ')[1].split('/').reverse().join('-'));
              const dateB = new Date(b.split(' ')[1].split('/').reverse().join('-'));
              return dateB.getTime() - dateA.getTime();
            });
            
            if (sortedDates.length === 0) {
              return (
                <View style={themedStyles.emptySessions}>
                  <Ionicons name="time-outline" size={32} color={theme.colors.primary} />
                  <Text style={themedStyles.emptySessionsText}>
                    No hay sesiones registradas
                  </Text>
                </View>
              );
            }
            
            return sortedDates.map((dateKey) => {
              const sessionsForDay = groupedSessions[dateKey];
              
              // Verificar si la fecha es hoy
              const today = new Date();
              const todayFormatted = formatSessionDate(today.toISOString());
              const isToday = dateKey === todayFormatted;
              
              // Determinar el título a mostrar
              const dayTitle = isToday ? `Hoy (${sessionsForDay.length})` : `${dateKey} (${sessionsForDay.length})`;
              
              return (
                <View key={dateKey} style={themedStyles.dayGroup}>
                  <Text style={themedStyles.sessionsTitle}>
                    {dayTitle}
                  </Text>
                  
                  {sessionsForDay.map((session) => {
                    const status = getSessionStatus(session);
                    const duration = getSessionDuration(session);
                    const entradaTime = formatSessionTime(session.hora_entrada);
                    const salidaTime = session.hora_salida ? formatSessionTime(session.hora_salida) : null;
                    
                    return (
                      <View key={session.id} style={themedStyles.sessionItem}>
                        <View style={[
                          themedStyles.sessionIcon,
                          { backgroundColor: session.activa ? theme.colors.success : theme.colors.primary }
                        ]}>
                          <Ionicons 
                            name={session.activa ? 'play' : 'checkmark'} 
                            size={20} 
                            color={theme.isDark ? '#000' : '#FFF'} 
                          />
                        </View>
                        
                        <View style={themedStyles.sessionInfo}>
                          <Text style={themedStyles.sessionDuration}>
                            Duración: {duration}
                          </Text>
                          <View style={themedStyles.sessionTimes}>
                            <Text style={themedStyles.sessionTime} numberOfLines={1}>
                              Entrada: {entradaTime}
                            </Text>
                            {salidaTime && (
                              <Text style={themedStyles.sessionTime} numberOfLines={1}>
                                Salida: {salidaTime}
                              </Text>
                            )}
                          </View>
                        </View>
                        
                        <View style={[themedStyles.sessionStatus, { backgroundColor: status.color }]}>
                          <Text style={themedStyles.sessionStatusText}>
                            {status.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            });
          })()}
        </View>
      </ScrollView>
    </View>
  );
}
