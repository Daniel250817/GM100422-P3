export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
  };
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  expiresAt?: string;
  twoFactorEnabled?: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
}
