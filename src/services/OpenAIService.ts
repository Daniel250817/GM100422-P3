interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

class OpenAIService {
  private apiKey: string = '';
  private baseURL: string = 'https://api.openai.com/v1';

  constructor() {
    // Configurar API key desde variables de entorno o configuración
    // this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    context?: any
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.log('OpenAI API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(context: any): string {
    return `Eres un asistente de IA para la aplicación TimeTrack, una app de gestión de tiempo y productividad.

CONTEXTO DEL USUARIO:
- Rutinas disponibles: ${context?.routines?.map((r: any) => r.titulo).join(', ') || 'Ninguna'}
- Horarios recientes: ${context?.schedules?.map((s: any) => s.titulo).join(', ') || 'Ninguno'}
- Sesión activa: ${context?.hasActiveSession ? 'Sí' : 'No'}

CAPACIDADES:
1. Iniciar rutinas existentes
2. Crear nuevos horarios
3. Iniciar sesiones de trabajo
4. Proporcionar información sobre la actividad del usuario
5. Responder preguntas sobre la aplicación

INSTRUCCIONES:
- Responde de manera amigable y útil
- Si el usuario quiere iniciar una rutina, confirma cuál y ofrece iniciarla
- Si quiere crear un horario, pregunta por los detalles necesarios
- Si quiere iniciar una jornada, verifica si ya hay una activa
- Mantén las respuestas concisas pero informativas
- Usa emojis apropiados para hacer la conversación más amigable

FORMATO DE RESPUESTA:
- Para acciones: Responde normalmente y menciona que puedes ejecutar la acción
- Para información: Proporciona la información solicitada de manera clara
- Para ayuda: Lista las capacidades disponibles

Responde en español y mantén un tono profesional pero amigable.`;
  }

  async determineIntent(message: string, context: any): Promise<{
    intent: string;
    confidence: number;
    entities?: any;
  }> {
    const prompt = `Analiza la siguiente intención del usuario en el contexto de TimeTrack:

MENSAJE: "${message}"

CONTEXTO:
- Rutinas: ${context?.routines?.map((r: any) => r.titulo).join(', ') || 'Ninguna'}
- Horarios: ${context?.schedules?.map((s: any) => s.titulo).join(', ') || 'Ninguno'}
- Sesión activa: ${context?.hasActiveSession ? 'Sí' : 'No'}

INTENCIONES POSIBLES:
- start_routine: Iniciar una rutina
- create_schedule: Crear un horario
- start_work_session: Iniciar una sesión de trabajo
- get_info: Obtener información
- help: Solicitar ayuda
- general: Conversación general

Responde SOLO con un JSON en este formato:
{
  "intent": "nombre_de_la_intencion",
  "confidence": 0.95,
  "entities": {
    "routine_name": "nombre si se menciona",
    "schedule_type": "tipo si se menciona",
    "project_name": "proyecto si se menciona"
  }
}`;

    try {
      const response = await this.generateResponse([
        { role: 'user', content: prompt }
      ], context);

      // Intentar parsear la respuesta JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        // Fallback a análisis simple
        return this.simpleIntentAnalysis(message);
      }
    } catch (error) {
      console.log('Error analizando intención:', error);
      return this.simpleIntentAnalysis(message);
    }
  }

  private simpleIntentAnalysis(message: string): {
    intent: string;
    confidence: number;
    entities?: any;
  } {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('iniciar') && lowerMessage.includes('rutina')) {
      return { intent: 'start_routine', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('crear') && lowerMessage.includes('horario')) {
      return { intent: 'create_schedule', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('iniciar') && (lowerMessage.includes('jornada') || lowerMessage.includes('trabajo'))) {
      return { intent: 'start_work_session', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('última') || lowerMessage.includes('reciente') || lowerMessage.includes('cuál')) {
      return { intent: 'get_info', confidence: 0.7 };
    }
    
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('qué puedo')) {
      return { intent: 'help', confidence: 0.9 };
    }
    
    return { intent: 'general', confidence: 0.5 };
  }
}

export default new OpenAIService();
