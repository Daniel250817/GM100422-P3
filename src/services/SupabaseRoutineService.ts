import { supabase } from '../lib/supabase'
import { Routine, RoutineCreateRequest, RoutineUpdateRequest, RoutineTimerInfo, RoutineStats } from '../interfaces/Routine'

class SupabaseRoutineService {
  // Obtener todas las rutinas del usuario
  async getRoutines(): Promise<{ success: boolean; routines?: Routine[]; message?: string }> {
    try {
      console.log('📤 Obteniendo rutinas...')
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

      console.log('📥 Rutinas obtenidas:', data)
      return { success: true, routines: data }
    } catch (error: any) {
      console.log('❌ Error en SupabaseRoutineService:', error)
      return { success: false, message: 'Error obteniendo rutinas' }
    }
  }

  // Crear nueva rutina
  async createRoutine(data: RoutineCreateRequest): Promise<{ success: boolean; routine?: Routine; message?: string }> {
    try {
      console.log('📤 Creando rutina...', data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const insertData = {
        user_id: user.id,
        titulo: data.titulo,
        descripcion: data.descripcion || '',
        activa: false, // Las rutinas se crean inactivas por defecto
        completada: false // Las rutinas se crean no completadas
        // No necesitamos tiempo_total_segundos, se calcula desde tiempo_inicio
      };
      
      console.log('📤 Enviando datos a Supabase:', insertData);
      
      const { data: routine, error } = await supabase
        .from('rutinas')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.log('❌ Error creando rutina:', error);
        return { success: false, message: error.message }
      }

      console.log('📥 Rutina creada por Supabase:', routine);
      console.log('📥 Valores de la rutina creada:', {
        activa: routine.activa,
        completada: routine.completada,
        titulo: routine.titulo
      });
      return { success: true, routine }
    } catch (error: any) {
      console.log('❌ Error creando rutina:', error)
      return { success: false, message: 'Error creando rutina' }
    }
  }

  // Actualizar rutina
  async updateRoutine(id: number, data: RoutineUpdateRequest): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Actualizando rutina...', id, data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Rutina actualizada' }
    } catch (error: any) {
      console.log('❌ Error actualizando rutina:', error)
      return { success: false, message: 'Error actualizando rutina' }
    }
  }

  // Eliminar rutina
  async deleteRoutine(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Eliminando rutina...', id)
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
    } catch (error: any) {
      console.log('❌ Error eliminando rutina:', error)
      return { success: false, message: 'Error eliminando rutina' }
    }
  }

  // Iniciar rutina
  async startRoutine(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Iniciando rutina...', id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .update({
          activa: true,
          tiempo_inicio: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Rutina iniciada' }
    } catch (error: any) {
      console.log('❌ Error iniciando rutina:', error)
      return { success: false, message: 'Error iniciando rutina' }
    }
  }

  // Finalizar rutina
  async completeRoutine(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Finalizando rutina...', id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .update({
          activa: false,
          completada: true
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Rutina finalizada' }
    } catch (error: any) {
      console.log('❌ Error finalizando rutina:', error)
      return { success: false, message: 'Error finalizando rutina' }
    }
  }

  // Parar rutina (detener pero no completar)
  async stopRoutine(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Deteniendo rutina...', id)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { error } = await supabase
        .from('rutinas')
        .update({
          activa: false
          // Mantener tiempo_inicio para poder calcular el tiempo total
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.log('❌ Error deteniendo rutina:', error);
        return { success: false, message: error.message }
      }

      console.log('✅ Rutina detenida y marcada como completada');
      return { success: true, message: 'Rutina detenida y completada' }
    } catch (error: any) {
      console.log('❌ Error deteniendo rutina:', error)
      return { success: false, message: 'Error deteniendo rutina' }
    }
  }

  // Obtener rutina activa
  async getActiveRoutine(): Promise<{ success: boolean; routine?: Routine; message?: string }> {
    try {
      console.log('📤 Obteniendo rutina activa...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .eq('user_id', user.id)
        .eq('activa', true)
        .single()

      if (error) {
        return { success: false, message: 'No hay rutina activa' }
      }

      return { success: true, routine: data }
    } catch (error: any) {
      console.log('❌ Error obteniendo rutina activa:', error)
      return { success: false, message: 'Error obteniendo rutina activa' }
    }
  }
}

export default new SupabaseRoutineService()
