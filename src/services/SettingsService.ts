import { supabase } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id: string;
  dark_mode: boolean;
  show_profile_image: boolean;
  two_factor_enabled: boolean;
  notifications_enabled: boolean;
  language: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsUpdate {
  dark_mode?: boolean;
  show_profile_image?: boolean;
  two_factor_enabled?: boolean;
  notifications_enabled?: boolean;
  language?: string;
  timezone?: string;
}

class SettingsService {
  // Obtener configuraciones del usuario actual
  async getUserSettings(): Promise<{ success: boolean; data?: UserSettings; message?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Error obteniendo configuraciones:', error);
        return {
          success: false,
          message: 'Error obteniendo configuraciones'
        };
      }

      return {
        success: true,
        data: data as UserSettings
      };
    } catch (error) {
      console.log('Error inesperado obteniendo configuraciones:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  // Actualizar configuraciones del usuario
  async updateSettings(settings: SettingsUpdate): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const { error } = await supabase
        .from('settings')
        .update(settings)
        .eq('user_id', user.id);

      if (error) {
        console.log('Error actualizando configuraciones:', error);
        return {
          success: false,
          message: 'Error actualizando configuraciones'
        };
      }

      return {
        success: true,
        message: 'Configuraciones actualizadas correctamente'
      };
    } catch (error) {
      console.log('Error inesperado actualizando configuraciones:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  // Crear configuraciones por defecto para un usuario
  async createDefaultSettings(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const defaultSettings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        dark_mode: true,
        show_profile_image: true,
        two_factor_enabled: true,
        notifications_enabled: true,
        language: 'es',
        timezone: 'America/Mexico_City'
      };

      const { error } = await supabase
        .from('settings')
        .insert(defaultSettings);

      if (error) {
        console.log('Error creando configuraciones por defecto:', error);
        return {
          success: false,
          message: 'Error creando configuraciones'
        };
      }

      return {
        success: true,
        message: 'Configuraciones creadas correctamente'
      };
    } catch (error) {
      console.log('Error inesperado creando configuraciones:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  // Actualizar configuración específica
  async updateSetting(key: keyof SettingsUpdate, value: boolean | string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const updateData = { [key]: value };
      
      const { error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.log(`Error actualizando ${key}:`, error);
        return {
          success: false,
          message: `Error actualizando ${key}`
        };
      }

      return {
        success: true,
        message: 'Configuración actualizada correctamente'
      };
    } catch (error) {
      console.log('Error inesperado actualizando configuración:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }

  // Obtener configuración específica
  async getSetting(key: keyof UserSettings): Promise<{ success: boolean; value?: any; message?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const { data, error } = await supabase
        .from('settings')
        .select(key)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log(`Error obteniendo ${key}:`, error);
        return {
          success: false,
          message: `Error obteniendo ${key}`
        };
      }

      return {
        success: true,
        value: (data as any)[key]
      };
    } catch (error) {
      console.log('Error inesperado obteniendo configuración:', error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  }
}

export default new SettingsService();
