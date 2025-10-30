import { supabase } from '../lib/supabase'
import { Session, SessionModel, SessionStartRequest, SessionEndRequest } from '../interfaces/Session'

class SupabaseSessionService {
  // Iniciar sesión de trabajo
  async startSession(data: SessionStartRequest): Promise<{ success: boolean; session?: SessionModel; message?: string }> {
    try {
      console.log('📤 Iniciando sesión...', data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const { data: session, error } = await supabase
        .from('sesiones_trabajo')
        .insert({
          user_id: user.id,
          hora_entrada: new Date().toISOString(),
          notas: data.notas || null,
          activa: true
        })
        .select()
        .single()

      if (error) {
        return { success: false, message: error.message }
      }

      console.log('📥 Sesión iniciada:', session)
      return { success: true, session }
    } catch (error: any) {
      console.log('❌ Error iniciando sesión:', error)
      return { success: false, message: 'Error iniciando sesión' }
    }
  }

  // Finalizar sesión de trabajo
  async endSession(data: SessionEndRequest): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('📤 Finalizando sesión...', data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      // Primero obtener la sesión para calcular la duración
      const { data: session, error: fetchError } = await supabase
        .from('sesiones_trabajo')
        .select('hora_entrada')
        .eq('id', data.sesionId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        console.log('❌ Error obteniendo sesión:', fetchError)
        return { success: false, message: 'Error obteniendo sesión' }
      }

      if (!session) {
        return { success: false, message: 'Sesión no encontrada' }
      }

      // Calcular duración en minutos (redondeo normal, no forzado)
      const horaEntrada = new Date(session.hora_entrada)
      const horaSalida = new Date()
      const duracionMs = horaSalida.getTime() - horaEntrada.getTime()
      // Usar Math.round para redondear correctamente (30+ segundos = 1 min, menos de 30 = 0 min)
      // Pero mejor guardar el valor exacto desde timestamps cuando se muestre
      const duracionMinutos = Math.round(duracionMs / (1000 * 60))

      console.log('📊 Duración calculada:', {
        horaEntrada: horaEntrada.toISOString(),
        horaSalida: horaSalida.toISOString(),
        duracionMs,
        duracionMinutos,
        duracionSegundos: Math.floor(duracionMs / 1000)
      })

      const { error } = await supabase
        .from('sesiones_trabajo')
        .update({
          hora_salida: horaSalida.toISOString(),
          duracion_minutos: duracionMinutos,
          activa: false,
          notas: data.notas || null
        })
        .eq('id', data.sesionId)
        .eq('user_id', user.id)

      if (error) {
        console.log('❌ Error actualizando sesión:', error)
        return { success: false, message: error.message }
      }

      console.log('✅ Sesión finalizada con duración:', duracionMinutos, 'minutos')
      return { success: true, message: 'Sesión finalizada' }
    } catch (error: any) {
      console.log('❌ Error finalizando sesión:', error)
      return { success: false, message: 'Error finalizando sesión' }
    }
  }

  // Obtener sesión activa
  async getActiveSession(): Promise<{ success: boolean; session?: SessionModel; message?: string }> {
    try {
      console.log('📤 Obteniendo sesión activa...')
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
    } catch (error: any) {
      console.log('❌ Error obteniendo sesión activa:', error)
      return { success: false, message: 'Error obteniendo sesión activa' }
    }
  }

  // Obtener sesiones del día
  async getTodaySessions(): Promise<{ success: boolean; sessions?: SessionModel[]; message?: string }> {
    try {
      console.log('📤 Obteniendo sesiones del día...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      const today = new Date()
      // Límites del día LOCAL pero expresados en UTC (ISO)
      const startLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      const startIso = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000).toISOString()
      const endIso = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000).toISOString()
      console.log('🕘 Rango día local (UTC ISO):', { startIso, endIso })

      // Traer sesiones que INICIEN hoy o que TERMINEN hoy (cualquier solapamiento con el día)
      const { data, error } = await supabase
        .from('sesiones_trabajo')
        .select('*')
        .eq('user_id', user.id)
        .or(
          `and(hora_entrada.gte.${startIso},hora_entrada.lt.${endIso}),` +
          `and(hora_salida.gte.${startIso},hora_salida.lt.${endIso})`
        )
        .order('hora_entrada', { ascending: false })

      if (error) {
        console.log('❌ Error en getTodaySessions:', error)
        return { success: false, message: error.message }
      }

      console.log('📥 Sesiones encontradas:', data?.length || 0)
      console.log('📥 Datos de sesiones:', data)
      return { success: true, sessions: data }
    } catch (error: any) {
      console.log('❌ Error obteniendo sesiones del día:', error)
      return { success: false, message: 'Error obteniendo sesiones del día' }
    }
  }

  // Recalcular duración de sesiones sin duración
  async recalculateSessionDurations(): Promise<{ success: boolean; updated?: number; message?: string }> {
    try {
      console.log('📤 Recalculando duraciones de sesiones...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      // Obtener todas las sesiones finalizadas del usuario
      const { data: allSessions, error: fetchAllError } = await supabase
        .from('sesiones_trabajo')
        .select('id, hora_entrada, hora_salida, duracion_minutos')
        .eq('user_id', user.id)
        .eq('activa', false)
        .not('hora_salida', 'is', null)

      if (fetchAllError) {
        console.log('❌ Error obteniendo sesiones:', fetchAllError)
        return { success: false, message: 'Error obteniendo sesiones' }
      }

      console.log('📊 Todas las sesiones finalizadas:', allSessions)

      // Filtrar sesiones que necesitan recálculo (duracion_minutos es null, 0 o undefined)
      const sessions = allSessions?.filter(session => 
        session.duracion_minutos === null || 
        session.duracion_minutos === undefined || 
        session.duracion_minutos === 0
      ) || []

      console.log(`📊 Sesiones que necesitan recálculo: ${sessions.length}`)
      console.log('📊 Detalles de sesiones a recalcular:', sessions)

      if (sessions.length === 0) {
        return { success: true, updated: 0, message: 'No hay sesiones para recalcular' }
      }

      let updatedCount = 0
      for (const session of sessions) {
        console.log(`🔄 Procesando sesión ${session.id}:`)
        console.log(`  - hora_entrada: ${session.hora_entrada}`)
        console.log(`  - hora_salida: ${session.hora_salida}`)
        console.log(`  - duracion_minutos actual: ${session.duracion_minutos}`)
        
        const horaEntrada = new Date(session.hora_entrada)
        const horaSalida = new Date(session.hora_salida)
        const duracionMs = horaSalida.getTime() - horaEntrada.getTime()
        // Usar redondeo normal (30+ segundos = 1 min, menos de 30 = 0 min)
        // No forzar mínimo 1 minuto para permitir sesiones cortas
        const duracionMinutos = Math.round(duracionMs / (1000 * 60))

        console.log(`  - duracionMs: ${duracionMs}`)
        console.log(`  - duracionSegundos: ${Math.floor(duracionMs / 1000)}`)
        console.log(`  - duracionMinutos calculada: ${duracionMinutos}`)

        const { error: updateError } = await supabase
          .from('sesiones_trabajo')
          .update({ duracion_minutos: duracionMinutos })
          .eq('id', session.id)

        if (updateError) {
          console.log(`❌ Error actualizando sesión ${session.id}:`, updateError)
        } else {
          updatedCount++
          console.log(`✅ Sesión ${session.id} actualizada: ${duracionMinutos} minutos`)
        }
      }

      return { success: true, updated: updatedCount, message: `${updatedCount} sesiones actualizadas` }
    } catch (error: any) {
      console.log('❌ Error recalculando duraciones:', error)
      return { success: false, message: 'Error recalculando duraciones' }
    }
  }

  // Obtener estadísticas
  async getStatistics(): Promise<{ success: boolean; stats?: any; message?: string }> {
    try {
      console.log('📤 Obteniendo estadísticas...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'Usuario no autenticado' }
      }

      // Obtener sesiones del mes actual
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('sesiones_trabajo')
        .select('*')
        .eq('user_id', user.id)
        .gte('hora_entrada', startOfMonth.toISOString())
        .lte('hora_entrada', endOfMonth.toISOString())
        .eq('activa', false)

      if (error) {
        return { success: false, message: error.message }
      }

      // Calcular estadísticas
      const totalSessions = data.length
      const totalMinutes = data.reduce((sum, session) => {
        if (session.duracion_minutos) {
          return sum + session.duracion_minutos
        }
        return sum
      }, 0)

      const stats = {
        totalSessions,
        totalMinutes,
        averageMinutes: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
      }

      return { success: true, stats }
    } catch (error: any) {
      console.log('❌ Error obteniendo estadísticas:', error)
      return { success: false, message: 'Error obteniendo estadísticas' }
    }
  }
}

export default new SupabaseSessionService()
