export interface AnalisisIA {
  id: number;
  user_id: number;
  tipo_analisis: TipoAnalisis;
  resultado_json: string;
  created_at: string;
  updated_at: string;
}

export type TipoAnalisis = 
  | 'productividad' 
  | 'patrones_trabajo' 
  | 'sugerencias' 
  | 'resumen_semanal';

export interface AnalisisResultado {
  resumen: string;
  patrones: string[];
  fortalezas: string[];
  areas_mejora: string[];
  sugerencias: string[];
  metricas: {
    horas_trabajadas_semana: number;
    puntualidad_promedio: number;
    completitud_rutinas: number;
  };
  recomendaciones_especificas: RecomendacionEspecifica[];
}

export interface RecomendacionEspecifica {
  categoria: string;
  accion: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface AnalisisRequest {
  tipo_analisis: TipoAnalisis;
  datos_usuario?: {
    sesiones?: any[];
    horarios?: any[];
    rutinas?: any[];
  };
}
