import { useState, useEffect } from 'react';
import SettingsService, { UserSettings, SettingsUpdate } from '../services/SettingsService';
import ToastService from '../services/ToastService';
import { supabase } from '../lib/supabase';

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar configuraciones al inicializar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await SettingsService.getUserSettings();
      
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        // Crear configuraciones por defecto si no existen
        await createDefaultSettings();
      }
    } catch (error) {
      console.log('Error cargando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await SettingsService.createDefaultSettings(user.id);
        if (result.success) {
          await loadSettings(); // Recargar configuraciones
        }
      }
    } catch (error) {
      console.log('Error creando configuraciones por defecto:', error);
    }
  };

  const updateSettings = async (newSettings: SettingsUpdate) => {
    try {
      setSaving(true);
      const result = await SettingsService.updateSettings(newSettings);
      
      if (result.success) {
        // Actualizar estado local
        if (settings) {
          setSettings({ ...settings, ...newSettings });
        }
        ToastService.success('Configuración guardada', 'Tus preferencias han sido guardadas');
        return true;
      } else {
        ToastService.error('Error', result.message || 'No se pudieron guardar las configuraciones');
        return false;
      }
    } catch (error) {
      console.log('Error actualizando configuraciones:', error);
      ToastService.error('Error', 'No se pudieron guardar las configuraciones');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async (key: keyof SettingsUpdate, value: boolean | string) => {
    try {
      setSaving(true);
      console.log('💾 Actualizando configuración:', { key, value });
      
      // Actualizar estado local inmediatamente para UI responsiva
      if (settings) {
        setSettings({ ...settings, [key]: value });
      }
      
      const result = await SettingsService.updateSetting(key, value);
      
      if (result.success) {
        console.log('✅ Configuración actualizada en BD:', { key, value });
        return true;
      } else {
        // Revertir cambio local si falla en BD
        if (settings) {
          setSettings({ ...settings, [key]: !value });
        }
        ToastService.error('Error', result.message || 'No se pudo actualizar la configuración');
        return false;
      }
    } catch (error) {
      console.log('Error actualizando configuración:', error);
      // Revertir cambio local si hay error
      if (settings) {
        setSettings({ ...settings, [key]: !value });
      }
      ToastService.error('Error', 'No se pudo actualizar la configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = async () => {
    if (!settings) return;
    const newValue = !settings.dark_mode;
    console.log('🌙 Toggle dark mode:', { from: settings.dark_mode, to: newValue });
    
    // Actualizar estado local inmediatamente
    setSettings({ ...settings, dark_mode: newValue });
    
    // Actualizar en base de datos
    await updateSetting('dark_mode', newValue);
  };

  const toggleProfileImage = async () => {
    if (!settings) return;
    const newValue = !settings.show_profile_image;
    console.log('🖼️ Toggle profile image:', { from: settings.show_profile_image, to: newValue });
    
    // Actualizar estado local inmediatamente
    setSettings({ ...settings, show_profile_image: newValue });
    
    // Actualizar en base de datos
    await updateSetting('show_profile_image', newValue);
  };

  const toggleTwoFactor = async () => {
    if (!settings) return;
    const newValue = !settings.two_factor_enabled;
    console.log('🔐 Toggle two factor:', { from: settings.two_factor_enabled, to: newValue });
    
    // Actualizar estado local inmediatamente
    setSettings({ ...settings, two_factor_enabled: newValue });
    
    // Actualizar en base de datos
    await updateSetting('two_factor_enabled', newValue);
  };

  const toggleNotifications = async () => {
    if (!settings) return;
    const newValue = !settings.notifications_enabled;
    console.log('🔔 Toggle notifications:', { from: settings.notifications_enabled, to: newValue });
    
    // Actualizar estado local inmediatamente
    setSettings({ ...settings, notifications_enabled: newValue });
    
    // Actualizar en base de datos
    await updateSetting('notifications_enabled', newValue);
  };

  return {
    settings,
    loading,
    saving,
    loadSettings,
    updateSettings,
    updateSetting,
    toggleDarkMode,
    toggleProfileImage,
    toggleTwoFactor,
    toggleNotifications
  };
};
