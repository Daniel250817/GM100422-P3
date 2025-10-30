export interface Routine {
  id: number;
  user_id: string;
  titulo: string;
  descripcion: string;
  activa: boolean;
  tiempo_inicio: string | null;
  completada: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineCreateRequest {
  titulo: string;
  descripcion?: string;
}

export interface RoutineUpdateRequest {
  titulo?: string;
  descripcion?: string;
}

export interface RoutineTimerInfo {
  rutina: Routine;
  tiempoTranscurrido: number;
  tiempoFormateado: string;
}

export interface RoutineStats {
  totalRutinas: number;
  rutinasCompletadas: number;
  tiempoTotal: number;
  tiempoFormateado: string;
}