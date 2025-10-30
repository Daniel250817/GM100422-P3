export interface SesionTrabajo {
  id: number;
  user_id: number;
  hora_entrada: string;
  hora_salida: string | null;
  notas: string | null;
  duracion_minutos: number | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface SesionCreateRequest {
  notas?: string;
}

export interface SesionUpdateRequest {
  sesionId: number;
  notas?: string;
}

export interface SesionEstadisticas {
  total_sesiones: number;
  total_horas: number;
  promedio_horas_dia: number;
  sesion_mas_larga: number;
  sesion_mas_corta: number;
  dias_trabajados: number;
}

export interface SesionPaginacion {
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

// Aliases para compatibilidad
export type Session = SesionTrabajo;
export type SessionModel = SesionTrabajo;
export type SessionStartRequest = SesionCreateRequest;
export type SessionEndRequest = SesionUpdateRequest;