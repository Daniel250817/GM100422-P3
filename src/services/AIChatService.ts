import { supabase } from '../lib/supabase';
import GeminiService from './GeminiService';
import ChatHistoryService from './ChatHistoryService';
import SupabaseRoutineService from './SupabaseRoutineService';
import SupabaseScheduleService from './SupabaseScheduleService';
import SupabaseSessionService from './SupabaseSessionService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: {
    type: 'start_routine' | 'create_schedule' | 'start_work_session' | 'get_info';
    data?: any;
  };
}

interface AIResponse {
  message: string;
  action?: {
    type: 'start_routine' | 'create_routine' | 'create_schedule' | 'delete_schedules' | 'start_work_session' | 'get_info';
    data?: any;
  };
  suggestions?: string[];
  tokensUsed?: number;
}

class AIChatService {
  private useGemini: boolean = true; // Usar Gemini por defecto

  constructor() {
    // Configuración inicial - verificar si Gemini está disponible desde .env
    this.initializeFromEnv();
  }

  // Inicializar desde variables de entorno
  private async initializeFromEnv() {
    try {
      // Verificar si hay API key de Gemini en variables de entorno
      const hasGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (hasGeminiKey) {
        console.log('🤖 Gemini configurado desde variables de entorno');
        this.useGemini = true;
        // GeminiService ya se inicializa automáticamente en su constructor
      } else {
        console.log('⚠️ No se encontró API key de Gemini en variables de entorno, usando respuestas predefinidas');
        this.useGemini = false;
      }
    } catch (error) {
      console.log('Error inicializando desde variables de entorno:', error);
      this.useGemini = false;
    }
  }

  // Configurar API key para Gemini
  setGeminiApiKey(apiKey: string) {
    GeminiService.setApiKey(apiKey);
  }

  // Cambiar entre Gemini y respuestas predefinidas
  setUseGemini(useGemini: boolean) {
    this.useGemini = useGemini;
  }

  // Verificar si Gemini está configurado y funcionando
  async isGeminiConfigured(): Promise<boolean> {
    try {
      return await GeminiService.verifyConnection();
    } catch (error) {
      console.log('Error verificando Gemini:', error);
      return false;
    }
  }

  // Validar si un string es un UUID válido
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Procesar mensaje del usuario
  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Procesando mensaje:', userMessage);
      console.log('🆔 ID de usuario:', userId);

      // Verificar que el user_id es un UUID válido
      if (!this.isValidUUID(userId)) {
        console.log('❌ ERROR: user_id debe ser un UUID válido de Supabase');
        console.log('❌ ID recibido:', userId);
        throw new Error('user_id debe ser un UUID válido de Supabase');
      }

      // Verificar si Gemini está configurado antes de intentar usarlo
      if (this.useGemini) {
        const isGeminiReady = await this.isGeminiConfigured();
        if (!isGeminiReady) {
          console.log('⚠️ Gemini no está configurado, usando respuestas predefinidas');
          this.useGemini = false;
        }
      }

      // Guardar mensaje del usuario
      try {
        await ChatHistoryService.saveUserMessage(userId, userMessage);
      } catch (error) {
        console.log('Error guardando mensaje del usuario:', error);
        // Continuar sin guardar en historial
      }

      // Obtener contexto del usuario
      const context = await this.getUserContext(userId);
      
      // Determinar intención del usuario
      const intent = await this.determineIntent(userMessage, context);
      
      // Generar respuesta basada en la intención
      const response = await this.generateResponse(userMessage, intent, context);
      
      // Calcular tiempo de respuesta
      const responseTime = Date.now() - startTime;
      
      // Si hay una acción, ejecutarla automáticamente (solo si el mensaje no es muy corto)
      // Evitar ejecutar acciones en respuestas cortas como "Si", "No", etc.
      if (response.action && userMessage.trim().length > 3) {
        try {
          console.log('🚀 Ejecutando acción automáticamente:', response.action);
          const actionResult = await this.executeAction(response.action, userId);
          
          if (actionResult.success) {
            // Actualizar el mensaje con el resultado de la acción
            response.message += `\n\n✅ ${actionResult.message}`;
            console.log('✅ Acción ejecutada exitosamente:', actionResult.message);
          } else {
            response.message += `\n\n❌ Error: ${actionResult.message}`;
            console.log('❌ Error ejecutando acción:', actionResult.message);
          }
        } catch (error) {
          console.log('❌ Error ejecutando acción:', error);
          response.message += `\n\n❌ Error ejecutando acción: ${error}`;
        }
      } else if (response.action && userMessage.trim().length <= 3) {
        // Si el mensaje es corto y hay una acción, solo mostrar sugerencias pero no ejecutar
        console.log('⚠️ Mensaje muy corto, no ejecutando acción automáticamente');
        response.suggestions = ['Sí', 'No', 'Cancelar'];
      }
      
      // Guardar mensaje del asistente
      try {
        await ChatHistoryService.saveAssistantMessage(userId, response.message, {
          intent: intent,
          actionType: response.action?.type,
          actionData: response.action?.data,
          responseTimeMs: responseTime,
          tokensUsed: response.tokensUsed
        });
      } catch (error) {
        console.log('Error guardando mensaje del asistente:', error);
        // Continuar sin guardar en historial
      }
      
      return response;
    } catch (error) {
      console.log('❌ Error procesando mensaje:', error);
      
      // Verificar si es error de cuota de Gemini
      const isQuotaError = error instanceof Error && error.message.includes('quota');
      
      let errorMessage = 'Lo siento, hubo un error procesando tu mensaje. Inténtalo de nuevo.';
      
      if (isQuotaError) {
        errorMessage = '⚠️ He alcanzado el límite de consultas diarias de Gemini. Usando respuestas predefinidas por ahora. Inténtalo de nuevo mañana.';
        console.log('🔄 Cambiando a respuestas predefinidas debido a cuota excedida');
        this.useGemini = false;
      }
      
      // Intentar guardar mensaje de error del asistente
      try {
        await ChatHistoryService.saveAssistantMessage(userId, errorMessage, {
          intent: 'error',
          responseTimeMs: Date.now() - startTime
        });
      } catch (saveError) {
        console.log('Error guardando mensaje de error:', saveError);
      }
      
      return {
        message: errorMessage,
        suggestions: ['Iniciar rutina', 'Crear horario', 'Eliminar horarios', 'Iniciar jornada']
      };
    }
  }

  // Obtener contexto completo del usuario
  private async getUserContext(userId: string) {
    try {
      const [routinesResult, schedulesResult, sessionsResult, allSessionsResult] = await Promise.all([
        supabase
          .from('rutinas')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('horarios_asignados')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('sesiones_trabajo')
          .select('*')
          .eq('user_id', userId)
          .eq('activa', true)
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('sesiones_trabajo')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const routines = routinesResult.data || [];
      const schedules = schedulesResult.data || [];
      const activeSessions = sessionsResult.data || [];
      const allSessions = allSessionsResult.data || [];

      // Calcular estadísticas
      const routinesStats = this.calculateRoutinesStats(routines);
      const schedulesStats = this.calculateSchedulesStats(schedules);
      const sessionsStats = this.calculateSessionsStats(allSessions);

      return {
        // Datos principales
        routines,
        schedules,
        recentSessions: allSessions.slice(0, 5),
        allSessions,
        hasActiveSession: activeSessions.length > 0,
        activeSession: activeSessions[0] || null,
        
        // Estadísticas
        routinesStats,
        schedulesStats,
        sessionsStats,
        
        // Información general
        totalRoutines: routines.length,
        totalSchedules: schedules.length,
        totalSessions: allSessions.length,
        hasData: routines.length > 0 || schedules.length > 0 || allSessions.length > 0,
        
        // Filtros útiles
        activeRoutines: routines.filter(r => r.activo === 'si'),
        inactiveRoutines: routines.filter(r => r.activo === 'no'),
        activeSchedules: schedules.filter(s => s.activo === 'si'),
        completedSessions: allSessions.filter(s => s.activa === false),
        
        // Últimas actividades
        lastRoutine: routines[0] || null,
        lastSchedule: schedules[0] || null,
        lastSession: allSessions[0] || null
      };
    } catch (error) {
      console.log('❌ Error obteniendo contexto:', error);
      return {
        routines: [],
        schedules: [],
        recentSessions: [],
        allSessions: [],
        hasActiveSession: false,
        activeSession: null,
        routinesStats: null,
        schedulesStats: null,
        sessionsStats: null,
        totalRoutines: 0,
        totalSchedules: 0,
        totalSessions: 0,
        hasData: false,
        activeRoutines: [],
        inactiveRoutines: [],
        activeSchedules: [],
        completedSessions: [],
        lastRoutine: null,
        lastSchedule: null,
        lastSession: null
      };
    }
  }

  // Calcular estadísticas de rutinas
  private calculateRoutinesStats(routines: any[]) {
    if (!routines || routines.length === 0) return null;
    
    return {
      total: routines.length,
      active: routines.filter(r => r.activo === 'si').length,
      inactive: routines.filter(r => r.activo === 'no').length,
      mostUsed: routines.reduce((max, r) => (r.veces_completada || 0) > (max.veces_completada || 0) ? r : max),
      lastCreated: routines[0],
      averageCompletion: routines.reduce((sum, r) => sum + (r.veces_completada || 0), 0) / routines.length
    };
  }

  // Calcular estadísticas de horarios
  private calculateSchedulesStats(schedules: any[]) {
    if (!schedules || schedules.length === 0) return null;
    
    return {
      total: schedules.length,
      active: schedules.filter(s => s.activo === 'si').length,
      inactive: schedules.filter(s => s.activo === 'no').length,
      lastCreated: schedules[0]
    };
  }

  // Calcular estadísticas de sesiones
  private calculateSessionsStats(sessions: any[]) {
    if (!sessions || sessions.length === 0) return null;
    
    const completedSessions = sessions.filter(s => s.activa === false);
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duracion_minutos || 0), 0);
    
    return {
      total: sessions.length,
      completed: completedSessions.length,
      active: sessions.filter(s => s.activa === true).length,
      totalDurationMinutes: totalDuration,
      averageDuration: completedSessions.length > 0 ? totalDuration / completedSessions.length : 0,
      lastCompleted: completedSessions[0] || null
    };
  }

  // Determinar intención del usuario usando IA
  private async determineIntent(message: string, context: any): Promise<string> {
    try {
      if (this.useGemini) {
        // Usar Gemini para análisis más inteligente
        const analysis = await GeminiService.determineIntent(message, context);
        return analysis.intent;
      } else {
        // Usar análisis simple
        return this.simpleIntentAnalysis(message);
      }
    } catch (error) {
      console.log('Error usando Gemini, usando análisis simple:', error);
      // Si Gemini falla, desactivar temporalmente y usar análisis simple
      this.useGemini = false;
      return this.simpleIntentAnalysis(message);
    }
  }

  // Análisis simple de intención (fallback)
  private simpleIntentAnalysis(message: string): string {
    const lowerMessage = message.toLowerCase().trim();
    
    // Respuestas muy cortas no deben ejecutar acciones automáticamente
    if (lowerMessage === 'si' || lowerMessage === 'sí' || lowerMessage === 'no' || 
        lowerMessage === 'ok' || lowerMessage === 'okay' || lowerMessage.length < 3) {
      return 'general';
    }
    
    // Detectar CREAR rutina (prioridad alta)
    if ((lowerMessage.includes('crear') || lowerMessage.includes('nueva') || lowerMessage.includes('agregar') || lowerMessage.includes('poner')) && 
        (lowerMessage.includes('rutina') || lowerMessage.includes('tarea'))) {
      return 'create_routine';
    }
    
    // Detectar INICIAR rutina existente
    if (lowerMessage.includes('iniciar') && lowerMessage.includes('rutina')) {
      return 'start_routine';
    }
    
    // Detectar CREAR horario
    if ((lowerMessage.includes('crear') || lowerMessage.includes('nuevo') || lowerMessage.includes('agregar')) && 
        lowerMessage.includes('horario')) {
      return 'create_schedule';
    }
    
    // Detectar ELIMINAR horario
    if ((lowerMessage.includes('eliminar') || lowerMessage.includes('borrar') || lowerMessage.includes('quitar')) && 
        lowerMessage.includes('horario')) {
      return 'delete_schedules';
    }
    
    // Detectar INICIAR jornada/trabajo (SOLO si explícitamente menciona jornada, trabajo o sesión)
    if (lowerMessage.includes('iniciar') && (lowerMessage.includes('jornada') || lowerMessage.includes('trabajo') || 
        lowerMessage.includes('sesión') || lowerMessage.includes('sesion'))) {
      return 'start_work_session';
    }
    
    // Detectar preguntas de información
    if (lowerMessage.includes('última') || lowerMessage.includes('reciente') || 
        lowerMessage.includes('cuánt') || lowerMessage.includes('cuant') || 
        lowerMessage.includes('cuál') || lowerMessage.includes('cual') ||
        lowerMessage.includes('qué') || lowerMessage.includes('que') ||
        lowerMessage.startsWith('cuántos') || lowerMessage.startsWith('cuantos')) {
      return 'get_info';
    }
    
    // Detectar solicitud de ayuda
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('qué puedo') || 
        lowerMessage.includes('que puedo') || lowerMessage.includes('cómo') || 
        lowerMessage.includes('como')) {
      return 'help';
    }
    
    return 'general';
  }

  // Eliminar horarios
  private async deleteSchedules(scheduleData: any, userId: string) {
    try {
      const { dias = [2, 3, 4, 5] } = scheduleData; // Martes a Viernes por defecto
      
      const { error } = await supabase
        .from('horarios_asignados')
        .delete()
        .eq('user_id', userId)
        .in('dia_semana', dias);

      if (error) {
        console.log('Error eliminando horarios:', error);
        return { success: false, message: 'Error eliminando los horarios: ' + error.message };
      }

      const diasTexto = dias.map((d: number) => {
        const diasSemana: { [key: number]: string } = {
          0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 
          4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
        };
        return diasSemana[d];
      }).join(', ');

      return {
        success: true,
        message: `¡Horarios eliminados exitosamente para: ${diasTexto}!`,
        data: { deletedDays: dias }
      };
    } catch (error) {
      console.log('Error eliminando horarios:', error);
      return { success: false, message: 'Error eliminando los horarios' };
    }
  }

  // Extraer horas del mensaje
  private extractTimeFromMessage(message: string): { hora_inicio: string; hora_fin: string; dias: number[] } {
    const lowerMessage = message.toLowerCase();
    
    // Patrones para extraer horas
    const timePatterns = [
      /(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\s*a\s*(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i,
      /(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\s*a\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)/i,
      /de\s*(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\s*a\s*(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i,
      /(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/i,
      /(\d{1,2})\s*a\s*(\d{1,2})/i
    ];

    let hora_inicio = '09:00:00';
    let hora_fin = '17:00:00';
    let dias = [1, 2, 3, 4, 5]; // Lunes a Viernes por defecto

    for (const pattern of timePatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        if (pattern.source.includes(':')) {
          // Formato con minutos
          const startHour = parseInt(match[1]);
          const startMin = match[2] ? parseInt(match[2]) : 0;
          const endHour = parseInt(match[3]);
          const endMin = match[4] ? parseInt(match[4]) : 0;
          
          // Convertir AM/PM
          const startIsPM = match[3]?.toLowerCase().includes('p');
          const endIsPM = match[4]?.toLowerCase().includes('p');
          
          let finalStartHour = startIsPM && startHour !== 12 ? startHour + 12 : startHour;
          let finalEndHour = endIsPM && endHour !== 12 ? endHour + 12 : endHour;
          
          if (startIsPM && startHour === 12) finalStartHour = 12;
          if (endIsPM && endHour === 12) finalEndHour = 12;
          if (!startIsPM && startHour === 12) finalStartHour = 0;
          if (!endIsPM && endHour === 12) finalEndHour = 0;
          
          hora_inicio = `${finalStartHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`;
          hora_fin = `${finalEndHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
        } else {
          // Formato simple
          const startHour = parseInt(match[1]);
          const endHour = parseInt(match[2]);
          
          // Convertir AM/PM si está presente
          const startIsPM = match[2]?.toLowerCase().includes('p');
          const endIsPM = match[3]?.toLowerCase().includes('p');
          
          let finalStartHour = startIsPM && startHour !== 12 ? startHour + 12 : startHour;
          let finalEndHour = endIsPM && endHour !== 12 ? endHour + 12 : endHour;
          
          if (startIsPM && startHour === 12) finalStartHour = 12;
          if (endIsPM && endHour === 12) finalEndHour = 12;
          if (!startIsPM && startHour === 12) finalStartHour = 0;
          if (!endIsPM && endHour === 12) finalEndHour = 0;
          
          hora_inicio = `${finalStartHour.toString().padStart(2, '0')}:00:00`;
          hora_fin = `${finalEndHour.toString().padStart(2, '0')}:00:00`;
        }
        break;
      }
    }

    // Detectar días específicos
    if (lowerMessage.includes('lunes')) dias = [1];
    else if (lowerMessage.includes('martes')) dias = [2];
    else if (lowerMessage.includes('miércoles') || lowerMessage.includes('miercoles')) dias = [3];
    else if (lowerMessage.includes('jueves')) dias = [4];
    else if (lowerMessage.includes('viernes')) dias = [5];
    else if (lowerMessage.includes('sábado') || lowerMessage.includes('sabado')) dias = [6];
    else if (lowerMessage.includes('domingo')) dias = [0];
    else if (lowerMessage.includes('fin de semana')) dias = [0, 6];
    else if (lowerMessage.includes('todos los días') || lowerMessage.includes('todos los dias')) dias = [0, 1, 2, 3, 4, 5, 6];

    return { hora_inicio, hora_fin, dias };
  }

  // Generar respuesta basada en la intención
  private async generateResponse(message: string, intent: string, context: any): Promise<AIResponse> {
    try {
      if (this.useGemini) {
        // Usar Gemini para generar respuesta más inteligente
        const aiResponse = await GeminiService.generateResponse([
          { role: 'user', content: message }
        ], context);

        // Determinar si la respuesta requiere una acción
        let action = undefined;
        if (intent === 'create_routine') {
          // Extraer título y descripción del mensaje
          const entities = this.extractRoutineEntitiesFromMessage(message);
          action = {
            type: 'create_routine' as const,
            data: {
              titulo: entities.titulo || 'Nueva Rutina',
              descripcion: entities.descripcion || '',
              originalMessage: message
            }
          };
        } else if (intent === 'start_routine' && context.routines.length > 0) {
          action = {
            type: 'start_routine' as const,
            data: { routineId: context.routines[0].id, routineName: context.routines[0].titulo }
          };
        } else if (intent === 'create_schedule') {
          action = {
            type: 'create_schedule' as const,
            data: { step: 'type_selection' }
          };
        } else if (intent === 'start_work_session' && !context.hasActiveSession) {
          action = {
            type: 'start_work_session' as const,
            data: { step: 'project_selection' }
          };
        }

        // Estimar tokens usados (aproximación)
        const estimatedTokens = Math.ceil(aiResponse.length / 4);

        return {
          message: aiResponse,
          action,
          suggestions: this.getSuggestionsForIntent(intent),
          tokensUsed: estimatedTokens
        };
      } else {
        // Usar respuestas predefinidas
        return this.getPredefinedResponse(intent, message, context);
      }
    } catch (error) {
      console.log('Error generando respuesta con Gemini, usando respuestas predefinidas:', error);
      // Si Gemini falla, desactivar temporalmente y usar respuestas predefinidas
      this.useGemini = false;
      return this.getPredefinedResponse(intent, message, context);
    }
  }

  // Extraer entidades de rutina del mensaje
  private extractRoutineEntitiesFromMessage(message: string): { titulo?: string; descripcion?: string } {
    const lowerMessage = message.toLowerCase();
    const entities: { titulo?: string; descripcion?: string } = {};
    
    // Patrón específico: "ponle rutina nueva" o "ponle X"
    const ponleMatch = message.match(/(?:ponle|poner)[\s]+(?:rutina|nombre|titulo|título)[\s:]*["']?([^,"'\.]+)["']?/i);
    if (ponleMatch && ponleMatch[1]) {
      entities.titulo = ponleMatch[1].trim();
    }
    
    // Patrón: "rutina nueva" después de "ponle" o similar
    if (!entities.titulo) {
      const rutinaNuevaMatch = lowerMessage.match(/ponle[\s]+rutina[\s]+nueva/i);
      if (rutinaNuevaMatch) {
        entities.titulo = 'rutina nueva';
      }
    }
    
    // Buscar patrones para título: "rutina X", "llamada X", "título X"
    if (!entities.titulo) {
      const titlePatterns = [
        /(?:rutina|llama|título|titulo|nombre)[\s:]+["']?([^,"'\.]+)["']?/i,
        /(?:crear|nueva|agregar)[\s]+(?:rutina|tarea)[\s]+(?:llamada|titulada|con nombre)[\s:]*["']?([^,"'\.]+)["']?/i
      ];
      
      for (const pattern of titlePatterns) {
        const match = message.match(pattern);
        if (match && match[1] && !match[1].trim().toLowerCase().includes('descripción')) {
          entities.titulo = match[1].trim();
          break;
        }
      }
    }
    
    // Si no se encontró título específico, buscar después de "rutina" o "nueva rutina"
    if (!entities.titulo) {
      const rutinaMatch = message.match(/(?:crear|nueva)[\s]+rutina[,\s]+["']?([^,"'\.descripción]+)["']?/i);
      if (rutinaMatch && rutinaMatch[1] && rutinaMatch[1].trim()) {
        entities.titulo = rutinaMatch[1].trim();
      }
    }
    
    // Buscar descripción: "en descripción ponle X", "descripción X", "desc X"
    const descPatterns = [
      /(?:en|la)[\s]+(?:descripción|descripcion|desc)[\s]+(?:ponle|poner)[\s:]*["']?([^,"'\.]+)["']?/i,
      /(?:descripción|descripcion|desc)[\s:]+["']?([^,"'\.]+)["']?/i,
      /(?:y|con)[\s]+(?:en|la)?[\s]*(?:descripción|descripcion|desc)[\s:]*["']?([^,"'\.]+)["']?/i
    ];
    
    for (const pattern of descPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        entities.descripcion = match[1].trim();
        break;
      }
    }
    
    // Extraer específicamente "hecha por gemini"
    if (!entities.descripcion && lowerMessage.includes('hecha por gemini')) {
      entities.descripcion = 'hecha por gemini';
    }
    
    // Si no se encontró título, buscar "rutina nueva" en cualquier parte
    if (!entities.titulo && lowerMessage.includes('rutina nueva')) {
      entities.titulo = 'rutina nueva';
    }
    
    return entities;
  }

  // Obtener respuesta predefinida
  private getPredefinedResponse(intent: string, message: string, context: any): AIResponse {
    switch (intent) {
      case 'create_routine':
        return this.handleCreateRoutine(message, context);
      
      case 'start_routine':
        return this.handleStartRoutine(message, context);
      
      case 'create_schedule':
        return this.handleCreateSchedule(message, context);
      
      case 'delete_schedules':
        return this.handleDeleteSchedules(message, context);
      
      case 'start_work_session':
        return this.handleStartWorkSession(message, context);
      
      case 'get_info':
        return this.handleGetInfo(message, context);
      
      case 'help':
        return this.handleHelp();
      
      default:
        return this.handleGeneral(message, context);
    }
  }

  // Obtener sugerencias basadas en la intención
  private getSuggestionsForIntent(intent: string): string[] {
    switch (intent) {
      case 'start_routine':
        return ['Sí, iniciar', 'Elegir otra rutina', 'Ver todas las rutinas'];
      case 'create_schedule':
        return ['Horario de trabajo', 'Horario de estudio', 'Horario personalizado'];
      case 'start_work_session':
        return ['Proyecto actual', 'Nuevo proyecto', 'Sin proyecto específico'];
      case 'get_info':
        return ['Iniciar rutina', 'Crear horario', 'Ver más detalles'];
      default:
        return ['Iniciar rutina', 'Crear horario', 'Iniciar jornada', 'Ver ayuda'];
    }
  }

  // Manejar creación de rutina
  private handleCreateRoutine(message: string, context: any): AIResponse {
    // Extraer entidades del mensaje
    const entities = this.extractRoutineEntitiesFromMessage(message);
    
    const titulo = entities.titulo || 'Nueva Rutina';
    const descripcion = entities.descripcion || '';
    
    // Crear la acción para ejecutar
    const action = {
      type: 'create_routine' as const,
      data: {
        titulo,
        descripcion,
        originalMessage: message
      }
    };
    
    return {
      message: `Perfecto, voy a crear la rutina "${titulo}"${descripcion ? ` con la descripción: "${descripcion}"` : ''}.`,
      action,
      suggestions: ['Crear otra rutina', 'Ver mis rutinas', 'Iniciar una rutina']
    };
  }

  // Manejar inicio de rutina
  private handleStartRoutine(message: string, context: any): AIResponse {
    const routines = context.activeRoutines || context.routines || [];
    
    if (routines.length === 0) {
      if (context.routines && context.routines.length > 0) {
        return {
          message: `Tienes ${context.routines.length} rutinas, pero ninguna está activa. ¿Te gustaría activar "${context.routines[0].titulo}" o crear una nueva?`,
          suggestions: ['Activar rutina', 'Crear nueva rutina', 'Ver todas las rutinas']
        };
      } else {
        return {
          message: 'No tienes rutinas creadas. ¿Te gustaría crear tu primera rutina?',
          action: {
            type: 'create_routine',
            data: { 
              titulo: 'Mi Primera Rutina',
              descripcion: 'Una rutina para comenzar tu día con energía y productividad'
            }
          },
          suggestions: ['Crear nueva rutina', 'Ver horarios', 'Iniciar jornada']
        };
      }
    }

    // Buscar rutina por nombre o usar la más reciente
    const routine = this.findRoutineByName(message, routines) || routines[0];
    
    return {
      message: `¡Perfecto! Iniciando la rutina "${routine.titulo}". ${routine.veces_completada ? `Esta rutina la has completado ${routine.veces_completada} veces.` : 'Es la primera vez que la ejecutas.'} ¿Estás listo para comenzar?`,
      action: {
        type: 'start_routine',
        data: { 
          routineId: routine.id, 
          routineName: routine.titulo,
          availableRoutines: routines
        }
      },
      suggestions: ['Sí, iniciar', 'Elegir otra rutina', 'Ver todas las rutinas']
    };
  }

  // Manejar creación de horario
  private handleCreateSchedule(message: string, context: any): AIResponse {
    return {
      message: 'Voy a ayudarte a crear un nuevo horario. ¿Qué tipo de horario necesitas?',
      action: {
        type: 'create_schedule',
        data: { 
          step: 'type_selection',
          originalMessage: message
        }
      },
      suggestions: ['Horario de trabajo', 'Horario de estudio', 'Horario personalizado']
    };
  }

  // Manejar eliminación de horarios
  private handleDeleteSchedules(message: string, context: any): AIResponse {
    // Extraer días del mensaje
    const lowerMessage = message.toLowerCase();
    let dias = [2, 3, 4, 5]; // Martes a Viernes por defecto
    
    if (lowerMessage.includes('lunes')) dias = [1];
    else if (lowerMessage.includes('martes')) dias = [2];
    else if (lowerMessage.includes('miércoles') || lowerMessage.includes('miercoles')) dias = [3];
    else if (lowerMessage.includes('jueves')) dias = [4];
    else if (lowerMessage.includes('viernes')) dias = [5];
    else if (lowerMessage.includes('sábado') || lowerMessage.includes('sabado')) dias = [6];
    else if (lowerMessage.includes('domingo')) dias = [0];
    else if (lowerMessage.includes('fin de semana')) dias = [0, 6];
    else if (lowerMessage.includes('todos los días') || lowerMessage.includes('todos los dias')) dias = [0, 1, 2, 3, 4, 5, 6];
    else if (lowerMessage.includes('martes a viernes')) dias = [2, 3, 4, 5];
    else if (lowerMessage.includes('lunes a viernes')) dias = [1, 2, 3, 4, 5];

    const diasTexto = dias.map((d: number) => {
      const diasSemana: { [key: number]: string } = {
        0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 
        4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
      };
      return diasSemana[d];
    }).join(', ');

    return {
      message: `¿Estás seguro de que quieres eliminar los horarios de ${diasTexto}?`,
      action: {
        type: 'delete_schedules',
        data: { 
          dias: dias,
          originalMessage: message
        }
      },
      suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver mis horarios']
    };
  }

  // Manejar inicio de jornada
  private handleStartWorkSession(message: string, context: any): AIResponse {
    if (context.hasActiveSession) {
      return {
        message: 'Ya tienes una sesión de trabajo activa. ¿Quieres pausarla o continuar?',
        suggestions: ['Pausar sesión', 'Continuar', 'Ver estado actual']
      };
    }

    return {
      message: 'Perfecto, voy a iniciar tu jornada de trabajo. ¿En qué proyecto vas a trabajar?',
      action: {
        type: 'start_work_session',
        data: { step: 'project_selection' }
      },
      suggestions: ['Proyecto actual', 'Nuevo proyecto', 'Sin proyecto específico']
    };
  }

  // Manejar solicitud de información
  private handleGetInfo(message: string, context: any): AIResponse {
    const routines = context.routines || [];
    const schedules = context.schedules || [];
    const recentSessions = context.recentSessions || [];
    const allSessions = context.allSessions || [];

    let info = '📊 **Resumen de tu actividad:**\n\n';
    
    // Información de rutinas
    if (routines.length > 0) {
      const activeRoutines = context.activeRoutines?.length || 0;
      info += `📋 **Rutinas:** ${routines.length} total (${activeRoutines} activas)\n`;
      if (context.routinesStats?.mostUsed) {
        info += `   • Más usada: "${context.routinesStats.mostUsed.titulo}" (${context.routinesStats.mostUsed.veces_completada || 0} veces)\n`;
      }
      if (context.lastRoutine) {
        info += `   • Última: "${context.lastRoutine.titulo}"\n`;
      }
    } else {
      info += `📋 **Rutinas:** Ninguna creada\n`;
    }
    
    // Información de horarios
    if (schedules.length > 0) {
      const activeSchedules = context.activeSchedules?.length || 0;
      info += `⏰ **Horarios:** ${schedules.length} total (${activeSchedules} activos)\n`;
      if (context.lastSchedule) {
        info += `   • Último: "${context.lastSchedule.titulo}"\n`;
      }
    } else {
      info += `⏰ **Horarios:** Ninguno configurado\n`;
    }
    
    // Información de sesiones
    if (allSessions.length > 0) {
      const completedSessions = context.completedSessions?.length || 0;
      const totalDuration = context.sessionsStats?.totalDurationMinutes || 0;
      const hours = Math.floor(totalDuration / 60);
      const minutes = totalDuration % 60;
      
      info += `💼 **Sesiones:** ${allSessions.length} total (${completedSessions} completadas)\n`;
      info += `   • Tiempo total: ${hours}h ${minutes}m\n`;
      if (context.sessionsStats?.averageDuration > 0) {
        info += `   • Promedio: ${Math.round(context.sessionsStats.averageDuration)} min/sesión\n`;
      }
      if (context.lastSession) {
        info += `   • Última: ${context.lastSession.proyecto || 'Sin proyecto'} (${context.lastSession.duracion_minutos || 0} min)\n`;
      }
    } else {
      info += `💼 **Sesiones:** Ninguna registrada\n`;
    }
    
    // Sesión activa
    if (context.hasActiveSession && context.activeSession) {
      const activeTime = Math.floor((Date.now() - new Date(context.activeSession.created_at).getTime()) / 60000);
      info += `\n🟢 **Sesión activa:** ${context.activeSession.proyecto || 'Sin proyecto'} (${activeTime} min)\n`;
    }
    
    if (routines.length === 0 && schedules.length === 0 && allSessions.length === 0) {
      info = 'No tienes datos aún. ¿Te gustaría crear tu primera rutina o horario?';
    }

    return {
      message: info,
      suggestions: ['Iniciar rutina', 'Crear horario', 'Ver estadísticas', 'Iniciar jornada']
    };
  }

  // Manejar ayuda
  private handleHelp(): AIResponse {
    return {
      message: '¡Hola! Soy tu asistente de TimeTrack. Puedo ayudarte con:\n\n' +
              '• Iniciar rutinas\n' +
              '• Crear horarios\n' +
              '• Iniciar jornadas de trabajo\n' +
              '• Responder preguntas sobre tu actividad\n\n' +
              '¿En qué puedo ayudarte?',
      suggestions: ['Iniciar rutina', 'Crear horario', 'Iniciar jornada', 'Ver mi actividad']
    };
  }

  // Manejar mensajes generales
  private handleGeneral(message: string, context: any): AIResponse {
    return {
      message: 'Entiendo que quieres ayuda. ¿Podrías ser más específico? Por ejemplo:\n\n' +
              '• "Inicia mi última rutina"\n' +
              '• "Crea un horario de trabajo"\n' +
              '• "Inicia mi jornada"',
      suggestions: ['Iniciar rutina', 'Crear horario', 'Iniciar jornada', 'Ver ayuda']
    };
  }

  // Cargar historial de chat
  async loadChatHistory(userId: string, sessionId?: string): Promise<ChatMessage[]> {
    try {
      let messages: any[] = [];
      
      if (sessionId) {
        const result = await ChatHistoryService.getChatHistory(userId, sessionId);
        messages = result.success ? result.messages || [] : [];
      } else {
        const result = await ChatHistoryService.getRecentChatHistory(userId, 20);
        messages = result.success ? result.messages || [] : [];
      }
      
      // Convertir mensajes de base de datos a formato del componente
      return messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        action: msg.action_type ? {
          type: msg.action_type,
          data: msg.action_data
        } : undefined
      }));
    } catch (error) {
      console.log('❌ Error cargando historial:', error);
      return [];
    }
  }

  // Obtener sesiones de chat
  async getChatSessions(userId: string): Promise<any[]> {
    try {
      const result = await ChatHistoryService.getChatSessions(userId);
      return result.success ? result.sessions || [] : [];
    } catch (error) {
      console.log('❌ Error obteniendo sesiones:', error);
      return [];
    }
  }

  // Obtener estadísticas de chat
  async getChatStats(userId: string): Promise<any> {
    try {
      const result = await ChatHistoryService.getChatStats(userId);
      return result.success ? result.stats : null;
    } catch (error) {
      console.log('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  // Ejecutar acción específica
  async executeAction(action: { type: string; data?: any }, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      switch (action.type) {
        case 'start_routine':
          return await this.startRoutine(action.data.routineId, userId);
        
        case 'create_routine':
          return await this.createRoutine(action.data, userId);
        
        case 'create_schedule':
          return await this.createSchedule(action.data, userId);
        
        case 'delete_schedules':
          return await this.deleteSchedules(action.data, userId);
        
        case 'start_work_session':
          return await this.startWorkSession(action.data, userId);
        
        default:
          return { success: false, message: 'Acción no reconocida' };
      }
    } catch (error) {
      console.log('❌ Error ejecutando acción:', error);
      return { success: false, message: 'Error ejecutando la acción' };
    }
  }

  // Iniciar rutina
  private async startRoutine(routineId: number, userId: string) {
    try {
      // Aquí implementarías la lógica para iniciar la rutina
      // Por ejemplo, actualizar el estado en la base de datos
      
      return {
        success: true,
        message: '¡Rutina iniciada exitosamente!',
        data: { routineId }
      };
    } catch (error) {
      return { success: false, message: 'Error iniciando la rutina' };
    }
  }

  // Crear rutina
  private async createRoutine(routineData: any, userId: string) {
    try {
      const { titulo, descripcion } = routineData;
      
      if (!titulo || titulo.trim() === '') {
        return { success: false, message: 'El título de la rutina es requerido' };
      }

      // Usar el servicio correcto con los campos correctos
      const result = await SupabaseRoutineService.createRoutine({
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || ''
      });

      if (result.success && result.routine) {
        return {
          success: true,
          message: `¡Rutina "${result.routine.titulo}" creada exitosamente!`,
          data: { routineId: result.routine.id, routine: result.routine }
        };
      } else {
        return {
          success: false,
          message: result.message || 'Error creando la rutina'
        };
      }
    } catch (error: any) {
      console.log('Error creando rutina:', error);
      return { success: false, message: 'Error creando la rutina: ' + (error.message || 'Error desconocido') };
    }
  }

  // Crear horario
  private async createSchedule(scheduleData: any, userId: string) {
    try {
      // Extraer horas del mensaje original si está disponible
      const originalMessage = scheduleData.originalMessage || '';
      const extractedTime = this.extractTimeFromMessage(originalMessage);
      
      const { hora_inicio, hora_fin, dias } = extractedTime;
      
      // Mapear días de la semana
      const diasSemana: { [key: number]: string } = {
        0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 
        4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
      };

      const horariosCreados = [];
      
      for (const diaNum of dias) {
        const { data, error } = await supabase
          .from('horarios_asignados')
          .insert({
            user_id: userId,
            dia_semana: diaNum,
            dia_nombre: diasSemana[diaNum],
            hora_inicio: hora_inicio,
            hora_fin: hora_fin,
            activo: true
          })
          .select()
          .single();

        if (error) {
          console.log(`Error creando horario para ${diasSemana[diaNum]}:`, error);
          continue;
        }

        horariosCreados.push(data);
      }

      if (horariosCreados.length === 0) {
        return { success: false, message: 'Error creando los horarios' };
      }

      const diasTexto = horariosCreados.map(h => h.dia_nombre).join(', ');
      return {
        success: true,
        message: `¡Horario creado exitosamente para ${horariosCreados.length} días! (${diasTexto}, ${hora_inicio} - ${hora_fin})`,
        data: { schedules: horariosCreados }
      };
    } catch (error) {
      console.log('Error creando horario:', error);
      return { success: false, message: 'Error creando el horario' };
    }
  }

  // Iniciar sesión de trabajo
  private async startWorkSession(sessionData: any, userId: string) {
    try {
      // Usar el servicio correcto
      const result = await SupabaseSessionService.startSession({
        notas: sessionData?.notas || ''
      });

      if (result.success && result.session) {
        return {
          success: true,
          message: '¡Jornada iniciada exitosamente!',
          data: { sessionId: result.session.id, session: result.session }
        };
      } else {
        return {
          success: false,
          message: result.message || 'Error iniciando la jornada'
        };
      }
    } catch (error: any) {
      console.log('Error iniciando sesión de trabajo:', error);
      return { success: false, message: 'Error iniciando la jornada: ' + (error.message || 'Error desconocido') };
    }
  }

  // Buscar rutina por nombre
  private findRoutineByName(message: string, routines: any[]): any | null {
    const messageLower = message.toLowerCase();
    return routines.find(routine => 
      routine.titulo.toLowerCase().includes(messageLower) ||
      messageLower.includes(routine.titulo.toLowerCase())
    ) || null;
  }
}

export default new AIChatService();
