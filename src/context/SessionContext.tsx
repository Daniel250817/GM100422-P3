import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SupabaseSessionService from '../services/SupabaseSessionService';
import { SessionModel } from '../models/SessionModel';
import { SesionEstadisticas } from '../interfaces/Session';

interface SessionContextType {
  activeSession: SessionModel | null;
  todaySessions: SessionModel[];
  statistics: SesionEstadisticas | null;
  isLoading: boolean;
  marcarEntrada: (notas?: string) => Promise<{ success: boolean; message?: string }>;
  marcarSalida: (notas?: string) => Promise<{ success: boolean; message?: string }>;
  refreshActiveSession: () => Promise<void>;
  refreshTodaySessions: () => Promise<void>;
  refreshStatistics: (fecha_inicio?: string, fecha_fin?: string) => Promise<void>;
  getSessions: (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) => Promise<SessionModel[]>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<SessionModel | null>(null);
  const [todaySessions, setTodaySessions] = useState<SessionModel[]>([]);
  const [statistics, setStatistics] = useState<SesionEstadisticas | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sessionService = SupabaseSessionService;

  // Cargar sesión activa al inicializar
  useEffect(() => {
    refreshActiveSession();
    refreshTodaySessions();
  }, []);

  const marcarEntrada = async (notas?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setIsLoading(true);
      const result = await sessionService.startSession({ notas });
      
      if (result.success && result.session) {
        // Convertir Session a SessionModel
        const sessionModel = new SessionModel({
          id: result.session.id,
          user_id: 1, // TODO: obtener del contexto de auth
          hora_entrada: result.session.hora_entrada,
          hora_salida: result.session.hora_salida || null,
          notas: result.session.notas || null,
          duracion_minutos: result.session.duracion_minutos || null,
          activa: result.session.activa,
          created_at: result.session.created_at,
          updated_at: result.session.created_at
        });
        setActiveSession(sessionModel);
        await refreshTodaySessions();
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const marcarSalida = async (notas?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!activeSession) {
        return {
          success: false,
          message: 'No hay sesión activa'
        };
      }

      setIsLoading(true);
      const result = await sessionService.endSession({ sesionId: activeSession.id, notas });
      
      if (result.success) {
        setActiveSession(null);
        await refreshTodaySessions();
        await refreshStatistics();
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActiveSession = async (): Promise<void> => {
    try {
      const result = await sessionService.getActiveSession();
      if (result.success && result.session) {
        // Convertir Session a SessionModel
        const sessionModel = new SessionModel({
          id: result.session.id,
          user_id: 1, // TODO: obtener del contexto de auth
          hora_entrada: result.session.hora_entrada,
          hora_salida: result.session.hora_salida || null,
          notas: result.session.notas || null,
          duracion_minutos: result.session.duracion_minutos || null,
          activa: result.session.activa,
          created_at: result.session.created_at,
          updated_at: result.session.created_at
        });
        setActiveSession(sessionModel);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.log('Error refrescando sesión activa:', error);
      setActiveSession(null);
    }
  };

  const refreshTodaySessions = async (): Promise<void> => {
    try {
      // Método no disponible, usar sesión activa
      await refreshActiveSession();
      setTodaySessions([]);
    } catch (error) {
      console.log('Error refrescando sesiones de hoy:', error);
      setTodaySessions([]);
    }
  };

  const refreshStatistics = async (fecha_inicio?: string, fecha_fin?: string): Promise<void> => {
    try {
      const result = await sessionService.getStatistics();
      
      if (result.success && result.stats) {
        setStatistics(result.stats);
      }
    } catch (error) {
      console.log('Error refrescando estadísticas:', error);
    }
  };

  const getSessions = async (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }): Promise<SessionModel[]> => {
    try {
      // Método no disponible en SessionService
      return [];
    } catch (error) {
      console.log('Error obteniendo sesiones:', error);
      return [];
    }
  };

  const value: SessionContextType = {
    activeSession,
    todaySessions,
    statistics,
    isLoading,
    marcarEntrada,
    marcarSalida,
    refreshActiveSession,
    refreshTodaySessions,
    refreshStatistics,
    getSessions
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession debe ser usado dentro de un SessionProvider');
  }
  return context;
};
