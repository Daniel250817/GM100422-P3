import { SesionTrabajo } from '../interfaces/Session';

export class SessionModel {
  private _id: number;
  private _user_id: number;
  private _hora_entrada: string;
  private _hora_salida: string | null;
  private _notas: string | null;
  private _created_at: string;
  private _updated_at: string;

  constructor(sessionData: SesionTrabajo) {
    this._id = sessionData.id;
    this._user_id = sessionData.user_id;
    this._hora_entrada = sessionData.hora_entrada;
    this._hora_salida = sessionData.hora_salida;
    this._notas = sessionData.notas;
    this._created_at = sessionData.created_at;
    this._updated_at = sessionData.updated_at;
  }

  // Getters
  get id(): number {
    return this._id;
  }

  get user_id(): number {
    return this._user_id;
  }

  get hora_entrada(): string {
    return this._hora_entrada;
  }

  get hora_salida(): string | null {
    return this._hora_salida;
  }

  get notas(): string | null {
    return this._notas;
  }

  get created_at(): string {
    return this._created_at;
  }

  get updated_at(): string {
    return this._updated_at;
  }

  // Métodos de negocio
  isActiva(): boolean {
    return this._hora_salida === null;
  }

  getDuracion(): number | null {
    if (!this._hora_salida) {
      return null;
    }
    
    const entrada = new Date(this._hora_entrada);
    const salida = new Date(this._hora_salida);
    return Math.round((salida.getTime() - entrada.getTime()) / (1000 * 60)); // minutos
  }

  getDuracionFormateada(): string {
    const duracion = this.getDuracion();
    if (!duracion) {
      return 'En progreso';
    }

    const horas = Math.floor(duracion / 60);
    const minutos = duracion % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}m`;
    }
    return `${minutos}m`;
  }

  getDuracionActual(): number {
    if (!this.isActiva()) {
      return 0;
    }

    const entrada = new Date(this._hora_entrada);
    const ahora = new Date();
    return Math.round((ahora.getTime() - entrada.getTime()) / (1000 * 60)); // minutos
  }

  getFechaFormateada(): string {
    const fecha = new Date(this._hora_entrada);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getHoraEntradaFormateada(): string {
    const fecha = new Date(this._hora_entrada);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getHoraSalidaFormateada(): string | null {
    if (!this._hora_salida) {
      return null;
    }
    
    const fecha = new Date(this._hora_salida);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos de actualización
  updateNotas(notas: string): void {
    this._notas = notas;
  }

  marcarSalida(): void {
    this._hora_salida = new Date().toISOString();
  }

  // Serialización
  toJSON(): SesionTrabajo {
    return {
      id: this._id,
      user_id: this._user_id,
      hora_entrada: this._hora_entrada,
      hora_salida: this._hora_salida,
      notas: this._notas,
      duracion_minutos: this.getDuracion(),
      activa: this.isActiva(),
      created_at: this._created_at,
      updated_at: this._updated_at
    };
  }

  // Método estático para crear desde API response
  static fromApiResponse(data: SesionTrabajo): SessionModel {
    return new SessionModel(data);
  }
}
