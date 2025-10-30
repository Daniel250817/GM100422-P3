export interface HorarioAsignado {
  id: number;
  user_id: number;
  dia_semana: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_minutos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface HorarioCreateRequest {
  dia_semana: number;
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo?: boolean;
}

export interface HorarioUpdateRequest {
  dia_semana?: number;
  hora_inicio?: string;
  hora_fin?: string;
  activo?: boolean;
}

export const DIAS_SEMANA = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6
} as const;

export const DIAS_NOMBRES = [
  'Domingo',
  'Lunes', 
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
] as const;

// Aliases para compatibilidad
export type Schedule = HorarioAsignado;
export type ScheduleCreateRequest = HorarioCreateRequest;
export type ScheduleUpdateRequest = HorarioUpdateRequest;