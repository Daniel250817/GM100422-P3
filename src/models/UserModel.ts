import { User } from '../interfaces/User';

export class UserModel {
  private _id: string; // UUID de Supabase
  private _email: string;
  private _nombre: string;
  private _apellido: string;
  private _activo: 'si' | 'no';
  private _created_at: string;
  private _updated_at: string;

  constructor(userData: User) {
    this._id = userData.id;
    this._email = userData.email;
    this._nombre = userData.nombre;
    this._apellido = userData.apellido;
    this._activo = userData.activo;
    this._created_at = userData.created_at;
    this._updated_at = userData.updated_at;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get nombre(): string {
    return this._nombre;
  }

  get apellido(): string {
    return this._apellido;
  }

  get activo(): 'si' | 'no' {
    return this._activo;
  }

  get created_at(): string {
    return this._created_at;
  }

  get updated_at(): string {
    return this._updated_at;
  }

  // Métodos de negocio
  get nombreCompleto(): string {
    return `${this._nombre} ${this._apellido}`;
  }

  isActivo(): boolean {
    return this._activo === 'si';
  }

  getIniciales(): string {
    return `${this._nombre.charAt(0)}${this._apellido.charAt(0)}`.toUpperCase();
  }

  // Métodos de actualización
  updateProfile(data: Partial<Pick<User, 'nombre' | 'apellido'>>): void {
    if (data.nombre) {
      this._nombre = data.nombre;
    }
    if (data.apellido) {
      this._apellido = data.apellido;
    }
  }

  // Serialización
  toJSON(): User {
    return {
      id: this._id,
      email: this._email,
      nombre: this._nombre,
      apellido: this._apellido,
      activo: this._activo,
      created_at: this._created_at,
      updated_at: this._updated_at
    };
  }

  // Método estático para crear desde API response
  static fromApiResponse(data: User): UserModel {
    return new UserModel(data);
  }
}
