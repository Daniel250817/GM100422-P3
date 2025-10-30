import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  action_type?: string;
  action_data?: any;
  response_time_ms?: number;
  tokens_used?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  session_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string;
}

class ChatHistoryService {
  private currentSessionId: string | null = null;

  // Generar nuevo ID de sesión
  generateSessionId(): string {
    // Usar una función compatible con React Native
    this.currentSessionId = this.generateUUID();
    return this.currentSessionId;
  }

  // Generar UUID compatible con React Native
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Convertir ID numérico a UUID válido
  private numericIdToUUID(numericId: string | number): string {
    const id = numericId.toString();
    
    // Crear un hash determinístico del ID numérico
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    // Convertir a hexadecimal y asegurar longitud
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    
    // Generar UUID válido con formato correcto
    // Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const hex1 = hex.slice(0, 8);
    const hex2 = hex.slice(0, 4);
    const hex3 = '4' + hex.slice(4, 7); // Versión 4
    const hex4 = '8' + hex.slice(7, 8) + hex.slice(0, 2); // Variante 10xx
    const hex5 = (hex + hex + hex).slice(0, 12); // Asegurar 12 caracteres
    
    const uuid = `${hex1}-${hex2}-${hex3}-${hex4}-${hex5}`;
    
    // Verificar que el UUID generado es válido
    if (!this.isValidUUID(uuid)) {
      console.log('❌ UUID numérico generado no es válido:', uuid);
      // Fallback a UUID aleatorio
      return this.generateUUID();
    }
    
    return uuid;
  }

  // Validar si un string es un UUID válido
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Usar el ID de usuario tal como viene (debe ser UUID de Supabase)
  private convertUserId(userId: string): string {
    // Verificar que es un UUID válido
    if (!this.isValidUUID(userId)) {
      console.log('❌ ERROR: user_id debe ser un UUID válido de Supabase');
      console.log('❌ ID recibido:', userId);
      throw new Error('user_id debe ser un UUID válido de Supabase');
    }
    
    console.log('✅ Usando UUID de Supabase:', userId);
    return userId;
  }

  // Convertir string a UUID usando hash
  private stringToUUID(str: string): string {
    // Crear un hash simple del string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    // Convertir hash a string hexadecimal
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    
    // Generar UUID válido con formato correcto
    const uuid = `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-8${hex.slice(7, 8)}${hex.slice(0, 2)}-${hex.slice(0, 12)}`;
    
    // Verificar que el UUID generado es válido
    if (!this.isValidUUID(uuid)) {
      console.log('❌ UUID generado no es válido:', uuid);
      // Fallback a UUID aleatorio
      return this.generateUUID();
    }
    
    return uuid;
  }

  // Función de prueba para verificar conversión de UUIDs
  testUUIDConversion(userId: string): void {
    console.log(`🧪 Probando conversión de UUID para: ${userId}`);
    const converted = this.convertUserId(userId);
    const isValid = this.isValidUUID(converted);
    console.log(`Resultado: ${converted} - Válido: ${isValid}`);
    
    // Probar específicamente con ID "46"
    if (userId === "46") {
      console.log('🔍 Prueba específica para ID 46:');
      const testUUID = this.numericIdToUUID("46");
      const testValid = this.isValidUUID(testUUID);
      console.log(`UUID generado: ${testUUID}`);
      console.log(`Es válido: ${testValid}`);
    }
  }

  // Obtener el ID de sesión actual
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Establecer ID de sesión
  setCurrentSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  // Guardar mensaje del usuario
  async saveUserMessage(
    userId: string,
    content: string,
    sessionId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const currentSession = sessionId || this.currentSessionId || this.generateSessionId();
      const convertedUserId = this.convertUserId(userId);
      
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: convertedUserId,
          session_id: currentSession,
          role: 'user',
          content: content,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.log('Error guardando mensaje del usuario:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.log('Error guardando mensaje del usuario:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Guardar mensaje del asistente
  async saveAssistantMessage(
    userId: string,
    content: string,
    options: {
      intent?: string;
      actionType?: string;
      actionData?: any;
      responseTimeMs?: number;
      tokensUsed?: number;
      sessionId?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const currentSession = options.sessionId || this.currentSessionId || this.generateSessionId();
      const convertedUserId = this.convertUserId(userId);
      
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: convertedUserId,
          session_id: currentSession,
          role: 'assistant',
          content: content,
          intent: options.intent,
          action_type: options.actionType,
          action_data: options.actionData ? JSON.stringify(options.actionData) : null,
          response_time_ms: options.responseTimeMs,
          tokens_used: options.tokensUsed,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.log('Error guardando mensaje del asistente:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.log('Error guardando mensaje del asistente:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Obtener historial de chat de una sesión
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
    try {
      const convertedUserId = this.convertUserId(userId);
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', convertedUserId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.log('Error obteniendo historial de chat:', error);
        return { success: false, error: error.message };
      }

      // Parsear action_data si existe
      const messages = data?.map(msg => ({
        ...msg,
        action_data: msg.action_data ? JSON.parse(msg.action_data) : null
      })) || [];

      return { success: true, messages };
    } catch (error) {
      console.log('Error obteniendo historial de chat:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Obtener historial reciente del usuario
  async getRecentChatHistory(
    userId: string,
    limit: number = 20
  ): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
    try {
      const convertedUserId = this.convertUserId(userId);
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', convertedUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.log('Error obteniendo historial reciente:', error);
        return { success: false, error: error.message };
      }

      // Parsear action_data si existe
      const messages = data?.map(msg => ({
        ...msg,
        action_data: msg.action_data ? JSON.parse(msg.action_data) : null
      })) || [];

      return { success: true, messages: messages.reverse() }; // Invertir para orden cronológico
    } catch (error) {
      console.log('Error obteniendo historial reciente:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Obtener sesiones de chat del usuario
  async getChatSessions(
    userId: string,
    limit: number = 20
  ): Promise<{ success: boolean; sessions?: ChatSession[]; error?: string }> {
    try {
      const convertedUserId = this.convertUserId(userId);
      const { data, error } = await supabase
        .from('chat_history')
        .select(`
          session_id,
          user_id,
          created_at,
          updated_at,
          content,
          role
        `)
        .eq('user_id', convertedUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error obteniendo sesiones de chat:', error);
        return { success: false, error: error.message };
      }

      // Agrupar por session_id y crear resumen de sesiones
      const sessionMap = new Map<string, ChatSession>();
      
      data?.forEach(msg => {
        const sessionId = msg.session_id;
        
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            user_id: msg.user_id,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            message_count: 0,
            last_message: ''
          });
        }
        
        const session = sessionMap.get(sessionId)!;
        session.message_count++;
        
        // Actualizar última fecha y mensaje
        if (new Date(msg.created_at) > new Date(session.updated_at)) {
          session.updated_at = msg.created_at;
          session.last_message = msg.content;
        }
      });

      const sessions = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, limit);

      return { success: true, sessions };
    } catch (error) {
      console.log('Error obteniendo sesiones de chat:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Eliminar sesión de chat
  async deleteChatSession(
    userId: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        console.log('Error eliminando sesión de chat:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.log('Error eliminando sesión de chat:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Eliminar todo el historial del usuario
  async deleteAllChatHistory(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.log('Error eliminando historial completo:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.log('Error eliminando historial completo:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Obtener estadísticas de uso
  async getChatStats(
    userId: string,
    days: number = 30
  ): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const convertedUserId = this.convertUserId(userId);

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', convertedUserId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.log('Error obteniendo estadísticas:', error);
        return { success: false, error: error.message };
      }

      const stats = {
        totalMessages: data?.length || 0,
        userMessages: data?.filter(msg => msg.role === 'user').length || 0,
        assistantMessages: data?.filter(msg => msg.role === 'assistant').length || 0,
        totalTokens: data?.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0) || 0,
        averageResponseTime: data?.filter(msg => msg.response_time_ms)
          .reduce((sum, msg) => sum + msg.response_time_ms, 0) / 
          data?.filter(msg => msg.response_time_ms).length || 0,
        uniqueSessions: new Set(data?.map(msg => msg.session_id)).size || 0,
        topIntents: this.getTopIntents(data || [])
      };

      return { success: true, stats };
    } catch (error) {
      console.log('Error obteniendo estadísticas:', error);
      return { success: false, error: 'Error inesperado' };
    }
  }

  // Obtener intenciones más comunes
  private getTopIntents(messages: ChatMessage[]): Array<{ intent: string; count: number }> {
    const intentCount = new Map<string, number>();
    
    messages
      .filter(msg => msg.intent)
      .forEach(msg => {
        const intent = msg.intent!;
        intentCount.set(intent, (intentCount.get(intent) || 0) + 1);
      });

    return Array.from(intentCount.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

export default new ChatHistoryService();
