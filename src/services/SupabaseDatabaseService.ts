import { supabase } from '../lib/supabase'

export interface Session {
  id: number
  user_id: string
  hora_entrada: string
  hora_salida?: string
  duracion_minutos?: number
  notas?: string
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: number
  user_id: string
  dia_semana: number
  dia_nombre: string
  hora_inicio: string
  hora_fin: string
  duracion_minutos: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Routine {
  id: number
  user_id: string
  titulo: string
  descripcion?: string
  activa: boolean
  tiempo_inicio?: string
  completada: boolean
  created_at: string
  updated_at: string
}

class SupabaseDatabaseService {
  // ===== SESIONES DE TRABAJO =====
  
  async startSession(notas?: string): Promise<{ success: boolean; session?: Session; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('sesiones_trabajo')
        .insert({
          user_id: user.id,
          hora_entrada: new Date().toISOString(),
          notas: notas || null,
          activa: true
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, session: data }
    } catch (error) {
      return { success: false, message: 'Error al iniciar sesión' }
    }
  }

  async endSession(sessionId: number, notas?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('sesiones_trabajo')
        .update({
          hora_salida: new Date().toISOString(),
          activa: false,
          notas: notas || null
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Sesión finalizada' }
    } catch (error) {
      return { success: false, message: 'Error al finalizar sesión' }
    }
  }

  async getActiveSession(): Promise<{ success: boolean; session?: Session; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('sesiones_trabajo')
        .select('*')
        .eq('user_id', user.id)
        .eq('activa', true)
        .single()

      if (error) {
        return { success: false, message: 'No hay sesión activa' }
      }

      return { success: true, session: data }
    } catch (error) {
      return { success: false, message: 'Error al obtener sesión activa' }
    }
  }

  // ===== HORARIOS =====

  async getSchedules(): Promise<{ success: boolean; schedules?: Schedule[]; message?: string }> {
    try {
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

      return { success: true, schedules: data }
    } catch (error) {
      return { success: false, message: 'Error al obtener horarios' }
    }
  }

  async createSchedule(scheduleData: Omit<Schedule, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; schedule?: Schedule; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('horarios_asignados')
        .insert({
          ...scheduleData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, schedule: data }
    } catch (error) {
      return { success: false, message: 'Error al crear horario' }
    }
  }

  async updateSchedule(id: number, scheduleData: Partial<Schedule>): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('horarios_asignados')
        .update(scheduleData)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Horario actualizado' }
    } catch (error) {
      return { success: false, message: 'Error al actualizar horario' }
    }
  }

  async deleteSchedule(id: number): Promise<{ success: boolean; message?: string }> {
    try {
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
    } catch (error) {
      return { success: false, message: 'Error al eliminar horario' }
    }
  }

  // ===== RUTINAS =====

  async getRoutines(): Promise<{ success: boolean; routines?: Routine[]; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, routines: data }
    } catch (error) {
      return { success: false, message: 'Error al obtener rutinas' }
    }
  }

  async createRoutine(routineData: Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; routine?: Routine; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('rutinas')
        .insert({
          ...routineData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, routine: data }
    } catch (error) {
      return { success: false, message: 'Error al crear rutina' }
    }
  }

  async updateRoutine(id: number, routineData: Partial<Routine>): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .update(routineData)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Rutina actualizada' }
    } catch (error) {
      return { success: false, message: 'Error al actualizar rutina' }
    }
  }

  async deleteRoutine(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Rutina eliminada' }
    } catch (error) {
      return { success: false, message: 'Error al eliminar rutina' }
    }
  }
}

export default new SupabaseDatabaseService()
