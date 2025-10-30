import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SupabaseSessionService from '../services/SupabaseSessionService';
import { Session, SesionEstadisticas } from '../interfaces/Session';

interface SessionContextType {
  activeSession: Session | null;
  todaySessions: Session[];
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
  }) => Promise<{ success: boolean; sessions?: Session[]; message?: string }>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<SesionEstadisticas | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const marcarEntrada = async (notas?: string) => {
    setIsLoading(true);
    try {
      const result = await SupabaseSessionService.startSession({ notas });
      if (result.success && result.session) {
        setActiveSession(result.session);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const marcarSalida = async (notas?: string) => {
    if (!activeSession) {
      return { success: false, message: 'No hay sesión activa' };
    }

    setIsLoading(true);
    try {
      const result = await SupabaseSessionService.endSession({ 
        sesionId: activeSession.id, 
        notas 
      });
      if (result.success) {
        setActiveSession(null);
        await refreshTodaySessions();
        await refreshStatistics();
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshActiveSession = async () => {
    try {
      const result = await SupabaseSessionService.getActiveSession();
      if (result.success && result.session) {
        setActiveSession(result.session);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.log('Error refreshing active session:', error);
      setActiveSession(null);
    }
  };

  const refreshTodaySessions = async () => {
    try {
      const result = await SupabaseSessionService.getTodaySessions();
      if (result.success && result.sessions) {
        setTodaySessions(result.sessions);
      } else {
        setTodaySessions([]);
      }
    } catch (error) {
      console.log('Error refreshing today sessions:', error);
      setTodaySessions([]);
    }
  };

  const refreshStatistics = async (fecha_inicio?: string, fecha_fin?: string) => {
    try {
      const result = await SupabaseSessionService.getStatistics();
      if (result.success && result.stats) {
        setStatistics(result.stats);
      } else {
        setStatistics(null);
      }
    } catch (error) {
      console.log('Error refreshing statistics:', error);
      setStatistics(null);
    }
  };

  const getSessions = async (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) => {
    try {
      // Por ahora, devolvemos las sesiones del día
      // En el futuro se puede implementar filtros más avanzados
      const result = await SupabaseSessionService.getTodaySessions();
      return result;
    } catch (error) {
      console.log('Error getting sessions:', error);
      return { success: false, message: 'Error obteniendo sesiones' };
    }
  };

  useEffect(() => {
    refreshActiveSession();
    refreshTodaySessions();
    refreshStatistics();
  }, []);

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
    getSessions,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
