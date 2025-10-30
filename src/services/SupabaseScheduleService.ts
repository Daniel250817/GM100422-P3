import { supabase } from '../lib/supabase'
import { Schedule, ScheduleCreateRequest, ScheduleUpdateRequest } from '../interfaces/Schedule'

class SupabaseScheduleService {
  // Obtener todos los horarios del usuario
  async getSchedules(): Promise<{ success: boolean; schedules?: Schedule[]; message?: string }> {
    try {
      console.log('📤 Obteniendo horarios...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('horarios_asignados')
        .select('*')
        .eq('user_id', user.id)
        .order('dia_semana')

      if (error) {
        return { success: false, message: error.message }
      }

      console.log('📥 Horarios obtenidos:', data)
      return { success: true, schedules: data }
    } catch (error: any) {
      console.log('❌ Error en SupabaseScheduleService:', error)
      return { success: false, message: 'Error obteniendo horarios' }
    }
  }

  // Crear nuevo horario
  async createSchedule(data: ScheduleCreateRequest): Promise<{ success: boolean; schedule?: Schedule; message?: string }> {
    try {
      console.log('📤 Creando horario...', data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data: schedule, error } = await supabase
        .from('horarios_asignados')
        .insert({
          user_id: user.id,
          dia_semana: data.dia_semana,
          dia_nombre: data.dia_nombre,
          hora_inicio: data.hora_inicio,
          hora_fin: data.hora_fin,
          activo: data.activo || 'si'
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      console.log('📥 Horario creado:', schedule)
      return { success: true, schedule }
    } catch (error: any) {
      console.log('❌ Error creando horario:', error)
      return { success: false, message: 'Error creando horario' }
    }
  }

  // Actualizar horario
  async updateSchedule(id: number, data: ScheduleUpdateRequest): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Actualizando horario...', id, data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('horarios_asignados')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.log('❌ Error en Supabase:', error);
        return { success: false, message: error.message }
      }

      console.log('✅ Horario actualizado exitosamente');
      return { success: true, message: 'Horario actualizado' }
    } catch (error: any) {
      console.log('❌ Error actualizando horario:', error)
      return { success: false, message: 'Error actualizando horario' }
    }
  }

  // Eliminar horario
  async deleteSchedule(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Eliminando horario...', id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('horarios_asignados')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Horario eliminado' }
    } catch (error: any) {
      console.log('❌ Error eliminando horario:', error)
      return { success: false, message: 'Error eliminando horario' }
    }
  }

  // Verificar permisos de horario
  async verifySchedulePermission(): Promise<{ success: boolean; canStart?: boolean; message?: string }> {
    try {
      console.log('📤 Verificando permisos de horario...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const today = new Date()
      const dayOfWeek = today.getDay()

      const { data, error } = await supabase
        .from('horarios_asignados')
        .select('*')
        .eq('user_id', user.id)
        .eq('dia_semana', dayOfWeek)
        .eq('activo', true)
        .single()

      if (error) {
        return { success: false, message: 'No hay horario asignado para hoy' }
      }

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      
      const canStart = currentTime >= data.hora_inicio && currentTime <= data.hora_fin

      return { 
        success: true, 
        canStart,
        message: canStart ? 'Puedes iniciar tu jornada' : 'No es tu horario de trabajo'
      }
    } catch (error: any) {
      console.log('❌ Error verificando permisos:', error)
      return { success: false, message: 'Error verificando permisos' }
    }
  }

  // Métodos de validación
  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  validateTimeRange(startTime: string, endTime: string): boolean {
    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      return false
    }
    
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    
    return start < end
  }
}

export default new SupabaseScheduleService()
