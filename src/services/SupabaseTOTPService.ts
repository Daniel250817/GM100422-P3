import { supabase } from '../lib/supabase';

export interface TOTPConfig {
  secret: string;
  issuer: string;
  account: string;
  qrCodeUrl: string;
  factorId?: string;
}

class SupabaseTOTPService {
  private readonly ISSUER = 'TimeTrack';

  /**
   * Inicia el proceso de inscripción TOTP o obtiene el existente
   */
  async enrollTOTP(userEmail: string): Promise<{ success: boolean; config?: TOTPConfig; error?: string }> {
    try {
      console.log('🔐 Iniciando inscripción TOTP para:', userEmail);
      
      // Primero, verificar si ya existe un factor TOTP
      const existingFactors = await this.getFactors();
      if (existingFactors.success && existingFactors.factors && existingFactors.factors.length > 0) {
        console.log('📋 Factor TOTP existente encontrado, reutilizando...');
        
        const existingFactor = existingFactors.factors[0];
        const config: TOTPConfig = {
          secret: existingFactor.secret || '',
          issuer: this.ISSUER,
          account: userEmail,
          qrCodeUrl: this.generateTOTPConfig(existingFactor.secret || '', userEmail).qrCodeUrl,
          factorId: existingFactor.id
        };

        console.log('✅ TOTP existente reutilizado:', config);
        return { success: true, config };
      }

      // Si no existe, crear uno nuevo
      console.log('🆕 Creando nuevo factor TOTP...');
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: this.ISSUER,
        friendlyName: `${this.ISSUER} - ${userEmail}`
      });

      if (error) {
        console.log('❌ Error inscribiendo TOTP:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No se recibieron datos de inscripción' };
      }

      console.log('📋 Datos de inscripción recibidos:', {
        hasTotp: !!data.totp,
        hasSecret: !!data.totp?.secret,
        hasQrCode: !!data.totp?.qr_code,
        hasUri: !!data.totp?.uri
      });

      // Extraer el secreto y QR code - Supabase MFA devuelve la estructura correcta
      let qrCodeUrl = '';
      let secret = '';
      
      // Usar directamente el secreto si está disponible
      if (data.totp?.secret) {
        secret = data.totp.secret;
        console.log('🔑 Secreto directo encontrado:', secret);
      }
      
      // Obtener el QR code URL
      if (data.totp?.qr_code) {
        qrCodeUrl = data.totp.qr_code;
      } else if (data.totp?.uri) {
        qrCodeUrl = data.totp.uri;
      }
      
      // Si no hay secreto directo, intentar extraerlo del QR code
      if (!secret && qrCodeUrl) {
        const extractedSecret = this.extractSecretFromQR(qrCodeUrl);
        if (extractedSecret) {
          secret = extractedSecret;
        }
      }
      
      // Si aún no hay secreto, generar uno temporal
      if (!secret) {
        console.log('❌ No se pudo obtener el secreto, generando uno temporal');
        secret = this.generateRandomSecret();
        qrCodeUrl = this.generateTOTPConfig(secret, userEmail).qrCodeUrl;
      }

      const config: TOTPConfig = {
        secret,
        issuer: this.ISSUER,
        account: userEmail,
        qrCodeUrl,
        factorId: data.id
      };

      console.log('✅ TOTP inscrito exitosamente:', config);
      return { success: true, config };
    } catch (error) {
      console.log('❌ Error en enrollTOTP:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Verifica un código TOTP
   */
  async verifyTOTP(factorId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Verificando código TOTP:', code);
      
      // Primero necesitamos crear un challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) {
        console.log('❌ Error creando challenge:', challengeError);
        return { success: false, error: challengeError.message };
      }

      if (!challengeData) {
        return { success: false, error: 'No se pudo crear el challenge' };
      }

      // Ahora verificar el código con el challenge
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (error) {
        console.log('❌ Error verificando TOTP:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ TOTP verificado exitosamente');
      return { success: true };
    } catch (error) {
      console.log('❌ Error en verifyTOTP:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Obtiene los factores MFA del usuario actual
   */
  async getFactors(): Promise<{ success: boolean; factors?: any[]; error?: string }> {
    try {
      console.log('🔍 Obteniendo factores MFA...');
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        console.log('❌ Error obteniendo factores:', error);
        // Si el error es de autenticación, no es un error real
        if (error.message.includes('not authenticated') || error.message.includes('session')) {
          console.log('⚠️ Usuario no autenticado, retornando factores vacíos');
          return { success: true, factors: [] };
        }
        return { success: false, error: error.message };
      }

      console.log('📋 Datos de factores recibidos:', {
        hasAll: !!data.all,
        allCount: data.all?.length || 0,
        hasTotp: !!data.totp,
        hasPhone: !!data.phone,
        hasWebauthn: !!data.webauthn
      });
      
      // Supabase devuelve los factores en data.all
      let factors: any[] = [];
      if (data.all) {
        factors = data.all.filter((f: any) => f.factor_type === 'totp');
      }

      console.log('🔍 Factores TOTP encontrados:', factors.length);
      return { success: true, factors };
    } catch (error) {
      console.log('❌ Error en getFactors:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Elimina un factor TOTP
   */
  async unenrollTOTP(factorId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Eliminando factor TOTP:', factorId);
      
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) {
        console.log('❌ Error eliminando TOTP:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ TOTP eliminado exitosamente');
      return { success: true };
    } catch (error) {
      console.log('❌ Error en unenrollTOTP:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Extrae el secreto de la URL del QR code
   */
  private extractSecretFromQR(qrCodeUrl: string): string | null {
    try {
      // La URL del QR tiene formato: otpauth://totp/...
      const url = new URL(qrCodeUrl);
      const secret = url.searchParams.get('secret');
      return secret;
    } catch (error) {
      console.log('❌ Error extrayendo secreto:', error);
      return null;
    }
  }

  /**
   * Obtiene la configuración TOTP existente
   */
  async getExistingTOTPConfig(userEmail: string): Promise<{ success: boolean; config?: TOTPConfig; error?: string }> {
    try {
      console.log('🔍 Buscando configuración TOTP existente...');
      
      // Verificar si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No hay sesión activa, no se puede obtener configuración TOTP');
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Intentar obtener factores usando la API MFA
      const existingFactors = await this.getFactors();
      if (existingFactors.success && existingFactors.factors && existingFactors.factors.length > 0) {
        console.log('📋 Factor TOTP existente encontrado via API MFA');
        
        const existingFactor = existingFactors.factors[0];
        
        // Si el factor no está verificado, reutilizarlo en lugar de eliminarlo
        if (existingFactor.status === 'unverified') {
          console.log('⚠️ Factor TOTP no verificado, reutilizando para evitar recreación constante');
          
          // Usar el factor existente y generar un secreto persistente
          const persistentSecret = this.generatePersistentSecret(existingFactor.id, userEmail);
          
          // Almacenar el secreto persistente
          await this.storeTOTPSecret(userEmail, persistentSecret);
          
          const config: TOTPConfig = {
            secret: persistentSecret,
            issuer: this.ISSUER,
            account: userEmail,
            qrCodeUrl: this.generateTOTPConfig(persistentSecret, userEmail).qrCodeUrl,
            factorId: existingFactor.id
          };
          return { success: true, config };
        } else {
          // Factor verificado - usar el existente con secreto persistente
          console.log('✅ Factor TOTP verificado encontrado, obteniendo secreto persistente');
          
          // Primero intentar obtener el secreto del almacenamiento local
          const storedSecret = await this.getStoredTOTPSecret(userEmail);
          let secret = storedSecret;
          
          // Si no hay secreto almacenado, generar uno persistente basado en el factor ID
          if (!secret) {
            console.log('📱 No hay secreto almacenado, generando uno persistente');
            secret = this.generatePersistentSecret(existingFactor.id, userEmail);
            // Almacenar el secreto generado para futuras consultas
            await this.storeTOTPSecret(userEmail, secret);
          }
          
          const config: TOTPConfig = {
            secret,
            issuer: this.ISSUER,
            account: userEmail,
            qrCodeUrl: this.generateTOTPConfig(secret, userEmail).qrCodeUrl,
            factorId: existingFactor.id
          };
          return { success: true, config };
        }
        
        const config: TOTPConfig = {
          secret: existingFactor.secret || '',
          issuer: this.ISSUER,
          account: userEmail,
          qrCodeUrl: this.generateTOTPConfig(existingFactor.secret || '', userEmail).qrCodeUrl,
          factorId: existingFactor.id
        };

        console.log('✅ Configuración TOTP existente obtenida:', config);
        return { success: true, config };
      }

      // Si no se encontraron factores via API MFA, intentar verificar si existe un factor
      // intentando crear uno temporalmente (esto fallará si ya existe)
      console.log('🔍 Verificando existencia de factor via intento de creación...');
      try {
        const testResult = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `${this.ISSUER} - ${userEmail}`,
          issuer: this.ISSUER
        });
        
        if (testResult.error && testResult.error.message.includes('already exists')) {
          console.log('✅ Factor TOTP existe (detectado por error de duplicado)');
          // El factor existe pero no pudimos obtenerlo via API, usar configuración de demostración
          const config: TOTPConfig = {
            secret: 'FACTOR_EXISTS_BUT_CANNOT_RETRIEVE',
            issuer: this.ISSUER,
            account: userEmail,
            qrCodeUrl: `otpauth://totp/${this.ISSUER}:${userEmail}?secret=FACTOR_EXISTS_BUT_CANNOT_RETRIEVE&issuer=${this.ISSUER}`,
            factorId: 'EXISTING_FACTOR'
          };
          return { success: true, config };
        }
      } catch (testError) {
        console.log('🔍 Error en verificación de existencia:', testError);
      }

      console.log('❌ No se encontraron factores TOTP');
      return { success: false, error: 'No se encontró configuración TOTP existente' };
    } catch (error) {
      console.log('❌ Error obteniendo configuración TOTP:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Procesa los datos de inscripción para crear la configuración TOTP
   */
  private async processEnrollData(enrollData: any, userEmail: string): Promise<{ success: boolean; config?: TOTPConfig; error?: string }> {
    console.log('📋 Datos del nuevo factor recibidos:', {
      hasId: !!enrollData.id,
      hasTotp: !!enrollData.totp,
      hasSecret: !!enrollData.totp?.secret,
      hasQrCode: !!enrollData.totp?.qr_code,
      hasUri: !!enrollData.totp?.uri
    });

    // Extraer el secreto y QR code - Supabase MFA devuelve la estructura correcta
    let qrCodeUrl = '';
    let secret = '';
    
    // Usar directamente el secreto si está disponible
    if (enrollData.totp?.secret) {
      secret = enrollData.totp.secret;
      console.log('🔑 Secreto directo del nuevo factor:', secret);
    }
    
    // Obtener el QR code URL
    if (enrollData.totp?.qr_code) {
      qrCodeUrl = enrollData.totp.qr_code;
    } else if (enrollData.totp?.uri) {
      qrCodeUrl = enrollData.totp.uri;
    }
    
    // Si no hay secreto directo, intentar extraerlo del QR code
    if (!secret && qrCodeUrl) {
      const extractedSecret = this.extractSecretFromQR(qrCodeUrl);
      if (extractedSecret) {
        secret = extractedSecret;
      }
    }
    
    // Si aún no hay secreto, generar uno temporal
    if (!secret) {
      console.log('❌ No se pudo obtener el secreto del nuevo factor, generando uno temporal');
      secret = this.generateRandomSecret();
      qrCodeUrl = this.generateTOTPConfig(secret, userEmail).qrCodeUrl;
    }

    // Almacenar el nuevo secreto para persistencia
    await this.storeTOTPSecret(userEmail, secret);

    const config: TOTPConfig = {
      secret,
      issuer: this.ISSUER,
      account: userEmail,
      qrCodeUrl,
      factorId: enrollData.id
    };

    console.log('✅ Secreto TOTP procesado exitosamente:', config);
    return { success: true, config };
  }

  /**
   * Renueva el secreto TOTP eliminando el factor existente y creando uno nuevo
   */
  async renewTOTPSecret(userEmail: string): Promise<{ success: boolean; config?: TOTPConfig; error?: string }> {
    try {
      console.log('🔄 Renovando secreto TOTP...');
      
      // Verificar si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No hay sesión activa, no se puede renovar TOTP');
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Obtener factores existentes
      const existingFactors = await this.getFactors();
      if (existingFactors.success && existingFactors.factors && existingFactors.factors.length > 0) {
        // Eliminar todos los factores existentes
        console.log('🗑️ Eliminando factores TOTP existentes...');
        for (const factor of existingFactors.factors) {
          try {
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({
              factorId: factor.id
            });
            if (unenrollError) {
              console.log('❌ Error eliminando factor:', unenrollError);
            } else {
              console.log('✅ Factor eliminado:', factor.id);
            }
          } catch (error) {
            console.log('❌ Error eliminando factor:', error);
          }
        }
        
        // Esperar un momento para que Supabase procese la eliminación
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar que se eliminaron correctamente
        const verifyFactors = await this.getFactors();
        if (verifyFactors.success && verifyFactors.factors && verifyFactors.factors.length > 0) {
          console.log('⚠️ Aún hay factores existentes, intentando eliminar nuevamente...');
          for (const factor of verifyFactors.factors) {
            try {
              await supabase.auth.mfa.unenroll({
                factorId: factor.id
              });
            } catch (error) {
              console.log('❌ Error en segunda eliminación:', error);
            }
          }
          // Esperar un poco más
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Crear un nuevo factor TOTP
      console.log('🆕 Creando nuevo factor TOTP...');
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${this.ISSUER} - ${userEmail}`,
        issuer: this.ISSUER
      });

      if (enrollError) {
        console.log('❌ Error creando nuevo factor:', enrollError);
        
        // Si el error es que ya existe un factor, intentar una vez más con un nombre diferente
        if (enrollError.message.includes('already exists')) {
          console.log('🔄 Factor aún existe, intentando con nombre único...');
          const uniqueName = `${this.ISSUER} - ${userEmail} - ${Date.now()}`;
          const { data: retryEnrollData, error: retryEnrollError } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: uniqueName,
            issuer: this.ISSUER
          });
          
          if (retryEnrollError) {
            console.log('❌ Error en segundo intento:', retryEnrollError);
            return { success: false, error: 'No se pudo renovar el secreto TOTP. Intenta más tarde.' };
          }
          
          // Usar los datos del segundo intento
          const finalEnrollData = retryEnrollData;
          return await this.processEnrollData(finalEnrollData, userEmail);
        }
        
        return { success: false, error: enrollError.message };
      }

      if (!enrollData) {
        return { success: false, error: 'No se recibieron datos de inscripción' };
      }

      // Procesar los datos de inscripción
      return await this.processEnrollData(enrollData, userEmail);
    } catch (error) {
      console.log('❌ Error renovando secreto TOTP:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Genera una configuración TOTP para mostrar en Settings (sin autenticación)
   */
  async generateTOTPConfigForSettings(userEmail: string): Promise<{ success: boolean; config?: TOTPConfig; error?: string }> {
    try {
      console.log('🔧 Generando configuración TOTP para Settings:', userEmail);
      
      // Generar un secreto aleatorio para mostrar en Settings
      const secret = this.generateRandomSecret();
      
      const config: TOTPConfig = {
        secret,
        issuer: this.ISSUER,
        account: userEmail,
        qrCodeUrl: this.generateTOTPConfig(secret, userEmail).qrCodeUrl
      };

      console.log('✅ Configuración TOTP generada para Settings:', config);
      return { success: true, config };
    } catch (error) {
      console.log('❌ Error generando configuración TOTP para Settings:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  /**
   * Genera un secreto aleatorio para TOTP
   */
  private generateRandomSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Almacena el secreto TOTP en el almacenamiento local para persistencia
   */
  private async storeTOTPSecret(userEmail: string, secret: string): Promise<void> {
    try {
      const key = `totp_secret_${userEmail}`;
      // Usar AsyncStorage para React Native
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, secret);
      console.log('💾 Secreto TOTP almacenado localmente');
    } catch (error) {
      console.log('❌ Error almacenando secreto TOTP:', error);
    }
  }

  /**
   * Obtiene el secreto TOTP del almacenamiento local
   */
  private async getStoredTOTPSecret(userEmail: string): Promise<string | null> {
    try {
      const key = `totp_secret_${userEmail}`;
      // Usar AsyncStorage para React Native
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const secret = await AsyncStorage.getItem(key);
      if (secret) {
        console.log('📱 Secreto TOTP recuperado del almacenamiento local');
      }
      return secret;
    } catch (error) {
      console.log('❌ Error obteniendo secreto TOTP:', error);
      return null;
    }
  }

  /**
   * Genera un secreto persistente basado en el factor ID y email
   * Esto asegura que el mismo secreto se genere siempre para el mismo factor
   */
  private generatePersistentSecret(factorId: string, userEmail: string): string {
    // Crear una semilla determinística basada en el factor ID y email
    const seed = `${factorId}-${userEmail}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    // Usar el hash como semilla para generar un secreto consistente
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      const index = Math.abs(hash + i) % chars.length;
      result += chars.charAt(index);
    }
    
    return result;
  }

  /**
   * Genera la configuración TOTP para mostrar al usuario
   */
  generateTOTPConfig(secret: string, account: string): TOTPConfig {
    // Usar formato más corto para el QR code
    // Solo incluir los parámetros esenciales para reducir el tamaño
    const qrCodeUrl = `otpauth://totp/${account}?secret=${secret}&issuer=${this.ISSUER}`;
    
    return {
      secret,
      issuer: this.ISSUER,
      account,
      qrCodeUrl
    };
  }
}

export default new SupabaseTOTPService();
