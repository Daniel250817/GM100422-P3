interface GeminiResponse {
  text: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

class GeminiService {
  private apiKey: string = '';
  private model: any = null;
  private genAI: any = null;

  constructor() {
    // Cargar API key desde variables de entorno
    this.loadApiKeyFromEnv();
  }

  // Cargar API key desde variables de entorno
  private loadApiKeyFromEnv() {
    const envApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (envApiKey) {
      // Limpiar espacios en blanco al inicio y final
      const cleanedApiKey = envApiKey.trim();
      if (cleanedApiKey) {
        this.apiKey = cleanedApiKey;
        console.log('🔑 API key de Gemini cargada desde variables de entorno');
        console.log('🔑 API key length:', cleanedApiKey.length);
        console.log('🔑 API key preview:', cleanedApiKey.substring(0, 10) + '...' + cleanedApiKey.substring(cleanedApiKey.length - 4));
        // Inicializar de forma asíncrona
        this.initializeGemini().catch(error => {
          console.log('Error inicializando Gemini:', error);
        });
      } else {
        console.log('⚠️ EXPO_PUBLIC_GEMINI_API_KEY está vacía (solo espacios)');
      }
    } else {
      console.log('⚠️ No se encontró EXPO_PUBLIC_GEMINI_API_KEY en variables de entorno');
      console.log('⚠️ Variables de entorno disponibles:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
    }
  }

  // Configurar API key manualmente (para configuración en la app)
  setApiKey(apiKey: string) {
    // Limpiar espacios en blanco al inicio y final
    const cleanedApiKey = apiKey.trim();
    if (!cleanedApiKey) {
      console.log('❌ API key vacía después de limpiar espacios');
      throw new Error('API key no puede estar vacía');
    }
    this.apiKey = cleanedApiKey;
    console.log('🔑 API key configurada manualmente');
    console.log('🔑 API key length:', cleanedApiKey.length);
    // Inicializar de forma asíncrona
    this.initializeGemini().catch(error => {
      console.log('Error inicializando Gemini:', error);
    });
  }

  // Inicializar Gemini
  private async initializeGemini() {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('API key no está configurada o está vacía');
      }
      
      console.log('🔄 Inicializando Gemini...');
      console.log('🔑 API key presente:', this.apiKey ? 'Sí' : 'No');
      console.log('🔑 API key length:', this.apiKey.length);
      
      // Importar dinámicamente para evitar errores en el servidor
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      if (!GoogleGenerativeAI) {
        throw new Error('No se pudo importar GoogleGenerativeAI');
      }
      
      // Crear instancia con la API key
      const cleanedApiKey = this.apiKey.trim();
      this.genAI = new (GoogleGenerativeAI as any)(cleanedApiKey);
      
      // Usar el modelo correcto según la documentación oficial
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      console.log('✅ Gemini inicializado con modelo gemini-2.0-flash-exp');
    } catch (error: any) {
      console.log('❌ Error inicializando Gemini:', error);
      console.log('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        apiKeyLength: this.apiKey?.length
      });
      throw new Error(`No se pudo inicializar Gemini. Verifica tu API key. Error: ${error?.message || 'Unknown error'}`);
    }
  }

  // Generar respuesta de chat
  async generateResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    context?: any
  ): Promise<string> {
    if (!this.model) {
      // Intentar inicializar si no está configurado
      if (this.apiKey) {
        await this.initializeGemini();
      } else {
        throw new Error('Gemini no está inicializado. Configura tu API key primero.');
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Convertir mensajes a formato de Gemini
      const chatHistory = this.convertMessagesToGeminiFormat(messages);
      
      // Agregar prompt del sistema al inicio
      const fullPrompt = `${systemPrompt}\n\n${chatHistory.map(msg => 
        msg.role === 'user' ? `Usuario: ${msg.parts[0].text}` : `Asistente: ${msg.parts[0].text}`
      ).join('\n\n')}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.log('Error generando respuesta con Gemini:', error);
      throw error;
    }
  }

  // Determinar intención del usuario
  async determineIntent(message: string, context: any): Promise<{
    intent: string;
    confidence: number;
    entities?: any;
  }> {
    if (!this.model) {
      // Intentar inicializar si no está configurado
      if (this.apiKey) {
        await this.initializeGemini();
      } else {
        throw new Error('Gemini no está inicializado');
      }
    }

    const routines = context?.routines || [];
    const schedules = context?.schedules || [];
    
    const prompt = `Analiza la siguiente intención del usuario en el contexto de TimeTrack:

MENSAJE: "${message}"

CONTEXTO DISPONIBLE:
- Rutinas existentes: ${routines.length > 0 ? routines.map((r: any) => `"${r.titulo}" (ID: ${r.id}, activa: ${r.activa})`).join(', ') : 'Ninguna'}
- Horarios existentes: ${schedules.length > 0 ? schedules.map((s: any) => `${s.dia_nombre} ${s.hora_inicio}-${s.hora_fin}`).join(', ') : 'Ninguno'}
- Sesión activa: ${context?.hasActiveSession ? 'Sí' : 'No'}

INTENCIONES POSIBLES:
- start_routine: Iniciar una rutina EXISTENTE (el usuario menciona el nombre o ID de una rutina que ya existe)
- create_routine: CREAR una nueva rutina (el usuario quiere crear/agregar/crear nueva rutina)
- create_schedule: Crear un nuevo horario (el usuario quiere crear/agregar horario para un día específico)
- start_work_session: Iniciar una sesión de trabajo/jornada (el usuario quiere comenzar su jornada de trabajo)
- get_info: Obtener información o estadísticas (preguntas como "cuántas rutinas tengo", "mis estadísticas", etc.)
- help: Solicitar ayuda sobre cómo usar la app
- general: Conversación general que no requiere acción

IMPORTANTE: 
- Si el usuario quiere CREAR una nueva rutina, usa "create_routine" y extrae "titulo" y "descripcion" (opcional)
- Si el usuario quiere INICIAR una rutina existente, usa "start_routine" y extrae "routineId" o "routine_name"
- Para crear horario, extrae "dia_semana" (0=Domingo, 1=Lunes, ..., 6=Sábado), "hora_inicio" (formato HH:MM), "hora_fin" (formato HH:MM)
- Para iniciar jornada, no se necesitan datos adicionales, solo confirmar la acción

Responde SOLO con un JSON válido en este formato exacto:
{
  "intent": "nombre_de_la_intencion",
  "confidence": 0.95,
  "entities": {
    "titulo": "título de la rutina si se menciona (para create_routine)",
    "descripcion": "descripción si se menciona (para create_routine)",
    "routineId": número_id_si_se_menciona_o_se_encuentra_por_nombre,
    "routine_name": "nombre de rutina existente si se menciona (para start_routine)",
    "dia_semana": número_0_a_6_si_se_menciona_día,
    "dia_nombre": "nombre del día si se menciona",
    "hora_inicio": "HH:MM si se menciona",
    "hora_fin": "HH:MM si se menciona"
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Intentar parsear la respuesta JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Mapear nombres de rutinas a IDs si es necesario
        if (parsed.entities?.routine_name && routines.length > 0) {
          const foundRoutine = routines.find((r: any) => 
            r.titulo.toLowerCase().includes(parsed.entities.routine_name.toLowerCase()) ||
            parsed.entities.routine_name.toLowerCase().includes(r.titulo.toLowerCase())
          );
          if (foundRoutine) {
            parsed.entities.routineId = foundRoutine.id;
          }
        }
        return parsed;
      } else {
        // Fallback a análisis simple
        return this.simpleIntentAnalysis(message);
      }
    } catch (error) {
      console.log('Error analizando intención con Gemini:', error);
      return this.simpleIntentAnalysis(message);
    }
  }

  // Análisis simple de intención (fallback)
  private simpleIntentAnalysis(message: string): {
    intent: string;
    confidence: number;
    entities?: any;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Detectar CREAR rutina (prioridad más alta)
    if ((lowerMessage.includes('crear') || lowerMessage.includes('nueva') || lowerMessage.includes('agregar')) && 
        (lowerMessage.includes('rutina') || lowerMessage.includes('tarea'))) {
      // Extraer título y descripción si están en el mensaje
      const entities: any = {};
      
      // Buscar patrones como "rutina X", "llamada X", "título X"
      const rutinaMatch = lowerMessage.match(/(?:rutina|llama|título|nombre)[\s:]*([^,\.]+)/);
      if (rutinaMatch) {
        entities.titulo = rutinaMatch[1].trim();
      }
      
      // Buscar descripción
      const descMatch = lowerMessage.match(/(?:descripción|descripcion|desc)[\s:]*([^,\.]+)/);
      if (descMatch) {
        entities.descripcion = descMatch[1].trim();
      }
      
      return { intent: 'create_routine', confidence: 0.9, entities };
    }
    
    // Detectar INICIAR rutina existente
    if (lowerMessage.includes('iniciar') && lowerMessage.includes('rutina')) {
      return { intent: 'start_routine', confidence: 0.8 };
    }
    
    // Detectar CREAR horario
    if ((lowerMessage.includes('crear') || lowerMessage.includes('nuevo') || lowerMessage.includes('agregar')) && 
        lowerMessage.includes('horario')) {
      return { intent: 'create_schedule', confidence: 0.8 };
    }
    
    // Detectar INICIAR jornada/trabajo (solo si explícitamente menciona jornada o trabajo)
    if (lowerMessage.includes('iniciar') && (lowerMessage.includes('jornada') || lowerMessage.includes('trabajo') || lowerMessage.includes('sesión') || lowerMessage.includes('sesion'))) {
      return { intent: 'start_work_session', confidence: 0.8 };
    }
    
    // Respuestas cortas como "Si", "No", "Ok" no deben ejecutar acciones automáticamente
    if (lowerMessage.trim() === 'si' || lowerMessage.trim() === 'sí' || lowerMessage.trim() === 'no' || 
        lowerMessage.trim() === 'ok' || lowerMessage.trim() === 'okay' || lowerMessage.trim().length < 3) {
      return { intent: 'general', confidence: 0.5 };
    }
    
    // Detectar preguntas de información
    if (lowerMessage.includes('última') || lowerMessage.includes('reciente') || 
        lowerMessage.includes('cuánt') || lowerMessage.includes('cuant') || 
        lowerMessage.includes('cuál') || lowerMessage.includes('cual') ||
        lowerMessage.includes('qué') || lowerMessage.includes('que') ||
        lowerMessage.startsWith('cuántos') || lowerMessage.startsWith('cuantos')) {
      return { intent: 'get_info', confidence: 0.7 };
    }
    
    // Detectar solicitud de ayuda
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('qué puedo') || 
        lowerMessage.includes('que puedo') || lowerMessage.includes('cómo') || 
        lowerMessage.includes('como')) {
      return { intent: 'help', confidence: 0.9 };
    }
    
    return { intent: 'general', confidence: 0.5 };
  }

  // Construir prompt del sistema
  private buildSystemPrompt(context: any): string {
    const routines = context?.routines || [];
    const schedules = context?.schedules || [];
    const allSessions = context?.allSessions || [];
    const activeRoutines = routines.filter((r: any) => r.activa === true);
    const completedSessions = allSessions.filter((s: any) => !s.activa);
    
    return `Eres un asistente de IA para la aplicación TimeTrack, una app de gestión de tiempo y productividad.

ESTRUCTURA EXACTA DE DATOS:

📋 RUTINAS (Routine):
- Campos requeridos: id (number), user_id (string), titulo (string), descripcion (string), activa (boolean), tiempo_inicio (string | null), completada (boolean), created_at (string), updated_at (string)
- Para CREAR rutina: REQUIERE { titulo: string, descripcion?: string }
- Las rutinas se crean con activa=false y completada=false por defecto
- Lista actual: ${routines.length > 0 ? routines.map((r: any) => `"${r.titulo}" (ID: ${r.id}, activa: ${r.activa}, completada: ${r.completada})`).join(', ') : 'NINGUNA'}

⏰ HORARIOS/SCHEDULES (HorarioAsignado):
- Campos requeridos: id (number), user_id (number), dia_semana (number 0-6), dia_nombre (string), hora_inicio (string formato "HH:MM"), hora_fin (string formato "HH:MM"), activo (boolean)
- Para CREAR horario: REQUIERE { dia_semana: number (0=Domingo,1=Lunes,2=Martes,3=Miércoles,4=Jueves,5=Viernes,6=Sábado), dia_nombre: string, hora_inicio: string, hora_fin: string, activo?: boolean }
- Días: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
- Lista actual: ${schedules.length > 0 ? schedules.map((s: any) => `"${s.dia_nombre}" (${s.hora_inicio}-${s.hora_fin}, activo: ${s.activo})`).join(', ') : 'NINGUNO'}

💼 SESIONES DE TRABAJO (Session):
- Para INICIAR sesión: REQUIERE { notas: string } (puede ser string vacío "")
- Campos de sesión: id, user_id, hora_entrada (ISO string), hora_salida (ISO string | null), activa (boolean), duracion_minutos (number | null), notas (string | null)
- Total: ${allSessions.length} (${completedSessions.length} completadas)
- Tiempo total: ${context?.sessionsStats?.totalDurationMinutes ? Math.floor(context.sessionsStats.totalDurationMinutes / 60) + 'h ' + (context.sessionsStats.totalDurationMinutes % 60) + 'm' : '0h 0m'}
- Promedio: ${context?.sessionsStats?.averageDuration ? Math.round(context.sessionsStats.averageDuration) + ' min/sesión' : 'N/A'}
- Sesión activa: ${context?.hasActiveSession ? 'Sí' : 'No'}

SERVICIOS DISPONIBLES Y MÉTODOS:
1. Rutinas: SupabaseRoutineService.createRoutine({ titulo: string, descripcion?: string }) → retorna { success, routine?, message? }
2. Horarios: SupabaseScheduleService.createSchedule({ dia_semana: number, dia_nombre: string, hora_inicio: string, hora_fin: string, activo?: boolean }) → retorna { success, schedule?, message? }
3. Sesiones: SupabaseSessionService.startSession({ notas: string }) → retorna { success, session?, message? }

REGLAS CRÍTICAS:
⚠️ NO INVENTES DATOS que no estén en el contexto
⚠️ NO uses campos que no existen (como "veces_completada", "tiempo_total", "proyecto", etc.)
⚠️ Para crear rutina: SOLO usa los campos titulo (obligatorio) y descripcion (opcional)
⚠️ Para crear horario: DEBES incluir dia_semana (0-6), dia_nombre ("Lunes", "Martes", etc.), hora_inicio ("09:00"), hora_fin ("17:00")
⚠️ Para iniciar sesión: solo necesitas confirmar, se usa { notas: "" }
⚠️ Si el usuario no especifica datos necesarios, pregunta antes de crear
⚠️ Solo menciona rutinas/horarios que realmente existan en el contexto proporcionado

INSTRUCCIONES:
- Usa SOLO los datos reales proporcionados, nunca inventes información
- Si el usuario quiere CREAR una rutina, pregunta por el título si no lo menciona
- Si el usuario quiere CREAR un horario, pregunta por día, hora inicio y hora fin si faltan
- Si el usuario quiere INICIAR una rutina existente, identifica la rutina por nombre o ID
- Menciona estadísticas SOLO si existen en el contexto
- Mantén un tono amigable y profesional
- Responde en español
- Si falta información para crear algo, pregunta antes de intentar crearlo

EJEMPLOS DE RESPUESTAS CORRECTAS:
- "Tienes ${routines.length} rutinas: ${routines.length > 0 ? routines.map((r: any) => `"${r.titulo}"`).join(', ') : 'ninguna'}. ¿Cuál quieres iniciar?"
- "Para crear una rutina necesito el título. ¿Cómo quieres llamarla?"
- "Has completado ${completedSessions.length} sesiones de trabajo."
- "Tus horarios actuales: ${schedules.length > 0 ? schedules.map((s: any) => `${s.dia_nombre} ${s.hora_inicio}-${s.hora_fin}`).join(', ') : 'ninguno asignado'}"
- "Para crear un horario necesito: el día de la semana, hora de inicio y hora de fin. ¿Para qué día quieres crear el horario?"`;
  }

  // Convertir mensajes a formato de Gemini
  private convertMessagesToGeminiFormat(messages: Array<{ role: string; content: string }>): ChatMessage[] {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  // Verificar conexión
  async verifyConnection(): Promise<boolean> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.log('❌ No hay API key configurada para verificar conexión');
      return false;
    }

    if (!this.model) {
      console.log('⚠️ Modelo no está inicializado, intentando inicializar...');
      try {
        await this.initializeGemini();
      } catch (error) {
        console.log('❌ Error inicializando modelo para verificar conexión:', error);
        return false;
      }
    }

    try {
      console.log('🔄 Verificando conexión con Gemini...');
      const result = await this.model.generateContent('Test connection');
      console.log('✅ Conexión con Gemini verificada exitosamente');
      return true;
    } catch (error: any) {
      console.log('❌ Error verificando conexión Gemini:', error);
      console.log('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        apiKeyLength: this.apiKey?.length,
        apiKeyPresent: !!this.apiKey
      });
      return false;
    }
  }

  // Obtener información de uso (si está disponible)
  getUsageInfo(): any {
    // Gemini no proporciona información detallada de uso como OpenAI
    // pero podemos estimar basado en la longitud del texto
    return {
      estimatedTokens: 0, // Se calculará en el servicio principal
      model: 'gemini-pro'
    };
  }
}

export default new GeminiService();
