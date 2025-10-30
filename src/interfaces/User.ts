export interface User {
  id: string; // UUID de Supabase
  email: string;
  nombre: string;
  apellido: string;
  activo: 'si' | 'no';
  created_at: string;
  updated_at: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export interface UserLoginRequest {
  email: string;
}

export interface UserOTPRequest {
  email: string;
  code: string;
}

export interface UserProfile {
  id: string;
  email: string;
  avatar_url?: string;
  nombre: string;
  apellido: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
}

export interface UserProfileUpdate {
  avatar_url?: string;
  nombre: string;
  apellido: string;
}