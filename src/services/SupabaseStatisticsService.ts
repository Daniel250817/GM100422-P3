import { supabase } from '../lib/supabase';

export interface WeeklyHoursData {
  day: string;
  hours: number;
}

export interface MonthlyProductivityData {
  month: string;
  productivity: number;
}

export interface RoutineStatsData {
  completed: number;
  pending: number;
  cancelled: number;
}

export interface LastFiveRoutinesData {
  name: string;
  value: number;
}

export interface GeneralStatsData {
  totalHours: number;
  completedRoutines: number;
  productivity: number;
  activeDays: number;
}

class SupabaseStatisticsService {
  // Obtener horas trabajadas por día de la semana (última semana)
  async getWeeklyHours(): Promise<{ success: boolean; data?: WeeklyHoursData[]; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Obtener la fecha de hace 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions, error } = await supabase
        .from('sesiones_trabajo')
        .select('hora_entrada, hora_salida')
        .eq('user_id', user.id)
        .eq('activa', false)
        .gte('hora_entrada', sevenDaysAgo.toISOString())
        .order('hora_entrada', { ascending: true });

      if (error) {
        return { success: false, message: error.message };
      }

      // Procesar datos por día de la semana
      const weeklyData: WeeklyHoursData[] = [
        { day: 'Lun', hours: 0 },
        { day: 'Mar', hours: 0 },
        { day: 'Mié', hours: 0 },
        { day: 'Jue', hours: 0 },
        { day: 'Vie', hours: 0 },
        { day: 'Sáb', hours: 0 },
        { day: 'Dom', hours: 0 },
      ];

      sessions?.forEach(session => {
        if (session.hora_entrada && session.hora_salida) {
          const startTime = new Date(session.hora_entrada);
          const endTime = new Date(session.hora_salida);
          const dayOfWeek = startTime.getDay(); // 0 = Domingo, 1 = Lunes, etc.
          
          // Convertir a índice de nuestro array (0 = Lunes)
          const arrayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          weeklyData[arrayIndex].hours += Math.round(hoursWorked * 10) / 10; // Redondear a 1 decimal
        }
      });

      return { success: true, data: weeklyData };
    } catch (error: any) {
      console.log('Error obteniendo horas semanales:', error);
      return { success: false, message: 'Error obteniendo horas semanales' };
    }
  }

  // Obtener estadísticas de rutinas
  async getRoutineStats(): Promise<{ success: boolean; data?: RoutineStatsData; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      const { data: routines, error } = await supabase
        .from('rutinas')
        .select('completada')
        .eq('user_id', user.id);

      if (error) {
        return { success: false, message: error.message };
      }

      const stats: RoutineStatsData = {
        completed: 0,
        pending: 0,
        cancelled: 0
      };

      routines?.forEach(routine => {
        if (routine.completada === true) {
          stats.completed++;
        } else if (routine.completada === false) {
          stats.pending++;
        } else {
          stats.cancelled++;
        }
      });

      return { success: true, data: stats };
    } catch (error: any) {
      console.log('Error obteniendo estadísticas de rutinas:', error);
      return { success: false, message: 'Error obteniendo estadísticas de rutinas' };
    }
  }

  // Obtener productividad mensual (últimos 3 meses)
  async getMonthlyProductivity(): Promise<{ success: boolean; data?: MonthlyProductivityData[]; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Obtener datos de los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: sessions, error } = await supabase
        .from('sesiones_trabajo')
        .select('hora_entrada, hora_salida, activa, duracion_minutos')
        .eq('user_id', user.id)
        .eq('activa', false) // Solo sesiones completadas
        .gte('hora_entrada', threeMonthsAgo.toISOString())
        .order('hora_entrada', { ascending: true });

      if (error) {
        console.log('Error obteniendo sesiones para productividad mensual:', error);
        return { success: false, message: error.message };
      }

      console.log(`📊 Total sesiones encontradas para productividad mensual: ${sessions?.length || 0}`);

      // Agrupar por mes
      const monthlyData: { [key: string]: { hours: number; days: number } } = {};
      
      sessions?.forEach(session => {
        if (!session.hora_entrada) return;

        const startTime = new Date(session.hora_entrada);
        let hoursWorked = 0;

        // Preferir calcular desde hora_salida si está disponible
        if (session.hora_salida) {
          const endTime = new Date(session.hora_salida);
          hoursWorked = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
        } else if (session.duracion_minutos) {
          // Usar duracion_minutos como respaldo
          hoursWorked = session.duracion_minutos / 60;
        } else {
          // Si no hay hora_salida ni duracion_minutos, saltar esta sesión
          console.warn('⚠️ Sesión sin hora_salida ni duracion_minutos:', session);
          return;
        }

        if (hoursWorked <= 0) return;

        const monthKey = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { hours: 0, days: 0 };
        }

        monthlyData[monthKey].hours += hoursWorked;
        
        // Agregar día único (usando fecha sin hora)
        const dayKey = startTime.toISOString().split('T')[0];
        if (!monthlyData[monthKey].hasOwnProperty('daysSet')) {
          (monthlyData[monthKey] as any).daysSet = new Set<string>();
        }
        (monthlyData[monthKey] as any).daysSet.add(dayKey);
      });

      // Convertir sets de días a contadores
      Object.keys(monthlyData).forEach(key => {
        const data = monthlyData[key] as any;
        if (data.daysSet) {
          data.days = data.daysSet.size;
          delete data.daysSet;
        }
      });

      // Convertir a array con nombres de meses (12 meses)
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const result: MonthlyProductivityData[] = [];
      
      console.log('📊 Datos agrupados por mes:', JSON.stringify(monthlyData, null, 2));
      
      // Obtener los últimos 3 meses
      for (let i = 2; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const data = monthlyData[monthKey];
        
        console.log(`📅 Mes ${monthNames[date.getMonth()]} (${monthKey}):`, data ? `${data.hours} horas, ${data.days} días` : 'Sin datos');
        
        // Calcular productividad basada en horas trabajadas (objetivo mensual)
        const targetHours = 160; // 40 horas/semana * 4 semanas
        let productivity = 0;
        if (data && data.hours > 0) {
          // Calcular porcentaje (usar Math.ceil para que valores pequeños muestren al menos 1%)
          const percentage = (data.hours / targetHours) * 100;
          productivity = Math.min(100, Math.max(1, Math.ceil(percentage)));
          console.log(`📈 ${monthNames[date.getMonth()]}: ${data.hours.toFixed(2)}h → ${percentage.toFixed(2)}% → ${productivity}% (con Math.ceil)`);
        }
        
        result.push({
          month: monthNames[date.getMonth()],
          productivity: Math.max(0, productivity)
        });
      }

      console.log('✅ Resultado final de productividad mensual:', result);
      return { success: true, data: result };
    } catch (error: any) {
      console.log('Error obteniendo productividad mensual:', error);
      return { success: false, message: 'Error obteniendo productividad mensual' };
    }
  }

  // Obtener últimas 5 rutinas (por nombre) para mostrar en gráfico
  async getLastFiveRoutines(): Promise<{ success: boolean; data?: LastFiveRoutinesData[]; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Obtener las últimas 5 rutinas (más recientes)
      const { data: routines, error } = await supabase
        .from('rutinas')
        .select('titulo, created_at, updated_at, completada, tiempo_inicio')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        return { success: false, message: error.message };
      }

      const result: LastFiveRoutinesData[] = (routines || []).map(r => {
        // Preferir tiempo_inicio como inicio real del trabajo
        const start = r.tiempo_inicio ? new Date(r.tiempo_inicio) : (r.created_at ? new Date(r.created_at) : (r.updated_at ? new Date(r.updated_at) : new Date()));

        // Regla de fin:
        // - Si está completada y updated_at es posterior a start => usar updated_at
        // - Si no está completada pero hay tiempo_inicio => usar ahora (duración en curso)
        // - En cualquier otro caso => misma fecha de inicio (duración 0)
        let end: Date = start;
        if (r.completada && r.updated_at) {
          const upd = new Date(r.updated_at);
          end = upd > start ? upd : start;
        } else if (!r.completada && r.tiempo_inicio) {
          const now = new Date();
          end = now > start ? now : start;
        }

        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const minutes = Math.round(diffMs / (1000 * 60));
        return {
          name: r.titulo || 'Sin título',
          value: minutes,
        };
      }).reverse(); // Mostrar de más antiguo a más reciente dentro de las 5

      return { success: true, data: result };
    } catch (error: any) {
      console.log('Error obteniendo últimas rutinas:', error);
      return { success: false, message: 'Error obteniendo últimas rutinas' };
    }
  }

  // Obtener estadísticas generales
  async getGeneralStats(): Promise<{ success: boolean; data?: GeneralStatsData; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
      }

      // Obtener sesiones de trabajo
      const { data: sessions, error: sessionsError } = await supabase
        .from('sesiones_trabajo')
        .select('hora_entrada, hora_salida')
        .eq('user_id', user.id)
        .eq('activa', false);

      if (sessionsError) {
        return { success: false, message: sessionsError.message };
      }

      // Obtener rutinas completadas
      const { data: routines, error: routinesError } = await supabase
        .from('rutinas')
        .select('completada')
        .eq('user_id', user.id)
        .eq('completada', true);

      if (routinesError) {
        return { success: false, message: routinesError.message };
      }

      // Calcular horas totales
      let totalHours = 0;
      const activeDays = new Set<string>();

      sessions?.forEach(session => {
        if (session.hora_entrada && session.hora_salida) {
          const startTime = new Date(session.hora_entrada);
          const endTime = new Date(session.hora_salida);
          const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += hoursWorked;
          
          // Agregar día activo
          const dayKey = startTime.toISOString().split('T')[0];
          activeDays.add(dayKey);
        }
      });

      // Calcular productividad (basada en horas trabajadas vs objetivo)
      const targetHoursPerMonth = 160; // 40 horas/semana * 4 semanas
      const productivity = Math.min(100, Math.round((totalHours / targetHoursPerMonth) * 100));

      const stats: GeneralStatsData = {
        totalHours: Math.round(totalHours * 10) / 10, // Redondear a 1 decimal
        completedRoutines: routines?.length || 0,
        productivity: Math.max(0, productivity),
        activeDays: activeDays.size
      };

      return { success: true, data: stats };
    } catch (error: any) {
      console.log('Error obteniendo estadísticas generales:', error);
      return { success: false, message: 'Error obteniendo estadísticas generales' };
    }
  }
}

export default new SupabaseStatisticsService();
