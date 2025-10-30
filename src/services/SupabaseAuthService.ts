import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import ToastService from './ToastService'

export interface AuthResponse {
  success: boolean
  message?: string
  user?: User
}

export interface RegisterData {
  email: string
  password: string
  nombre: string
  apellido: string
}

class SupabaseAuthService {
  // Registro de usuario
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nombre: data.nombre,
            apellido: data.apellido
          },
          emailRedirectTo: undefined // Esto fuerza el envío de OTP en lugar de enlace
        }
      })

      if (error) {
        console.log('Error en registro:', error)
        ToastService.error('Error de registro', error.message)
        return {
          success: false,
          message: error.message
        }
      }

      console.log('Registro exitoso, datos:', authData)
      ToastService.success('Registro exitoso', 'Revisa tu email para verificar tu cuenta')
      return {
        success: true,
        message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
        user: authData.user || undefined
      }
    } catch (error) {
      console.log('Error inesperado en registro:', error)
      ToastService.error('Error inesperado', 'No se pudo registrar el usuario')
      return {
        success: false,
        message: 'Error al registrar usuario'
      }
    }
  }

  // Verificar credenciales de usuario (SOLO verificar, NO autenticar)
  async login(email: string, password: string): Promise<AuthResponse & { twoFactorEnabled?: boolean }> {
    try {
      console.log('🔍 Verificando credenciales para:', email)
      
      // Verificar credenciales usando signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.log('❌ Error en credenciales:', error)
        
        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            message: 'Credenciales incorrectas'
          }
        }
        
        return {
          success: false,
          message: error.message
        }
      }

      console.log('✅ Credenciales verificadas correctamente')
      
      // Obtener configuración de two_factor_enabled del usuario
      let twoFactorEnabled = false;
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('two_factor_enabled')
          .eq('user_id', data.user?.id)
          .single();

        if (!settingsError && settingsData) {
          twoFactorEnabled = settingsData.two_factor_enabled;
          console.log('🔐 Configuración 2FA del usuario:', twoFactorEnabled);
        } else {
          console.log('⚠️ No se pudo obtener configuración 2FA, usando valor por defecto: false');
        }
      } catch (settingsError) {
        console.log('⚠️ Error obteniendo configuración 2FA:', settingsError);
      }
      
      // NO cerrar sesión - mantener autenticado para OTP
      return {
        success: true,
        message: 'Credenciales correctas',
        twoFactorEnabled
      }
    } catch (error) {
      console.log('❌ Error inesperado en login:', error)
      return {
        success: false,
        message: 'Error verificando credenciales'
      }
    }
  }

  // Enviar OTP por separado
  async sendOTP(email: string): Promise<AuthResponse> {
    try {
      console.log('📧 Enviando OTP a:', email)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: undefined }
      })
      
      if (error) {
        console.log('❌ Error enviando OTP:', error)
        
        // Manejar rate limiting específicamente
        if (error.message.includes('rate limit') || error.message.includes('6 seconds')) {
          return {
            success: false,
            message: 'Debes esperar 6 segundos antes de solicitar otro código'
          }
        }
        
        return {
          success: false,
          message: 'No se pudo enviar el código de verificación'
        }
      }

      console.log('✅ OTP enviado correctamente')
      return {
        success: true,
        message: 'Código de verificación enviado'
      }
    } catch (error) {
      console.log('❌ Error inesperado enviando OTP:', error)
      return {
        success: false,
        message: 'Error enviando código de verificación'
      }
    }
  }

  // Logout
  async logout(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        message: 'Sesión cerrada exitosamente'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al cerrar sesión'
      }
    }
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      return null
    }
  }

  // Verificar si hay sesión activa
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session
    } catch (error) {
      return false
    }
  }

  // Verificar OTP (para autenticación por email)
  async verifyOTP(email: string, code: string, password?: string): Promise<AuthResponse> {
    try {
      // Validar formato del código
      if (!this.isValidOTPFormat(code)) {
        return {
          success: false,
          message: 'El código debe tener exactamente 6 dígitos'
        }
      }

      console.log(`🔍 Verificando OTP para ${email}: ${code}`)

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email' // Cambiar a 'email' para que funcione tanto para registro como login
      })

      if (error) {
        console.log('❌ Error verificando OTP:', error)
        
        // Mensajes específicos según el tipo de error
        if (error.message.includes('Invalid token')) {
          return {
            success: false,
            message: 'Código incorrecto. Verifica que sea exactamente el mismo que recibiste por email.'
          }
        } else if (error.message.includes('expired')) {
          return {
            success: false,
            message: 'El código es inválido o ha expirado. Solicita uno nuevo.'
          }
        } else {
          return {
            success: false,
            message: `Error de verificación: ${error.message}`
          }
        }
      }

      // Si se proporciona contraseña, verificar credenciales después del OTP
      if (password) {
        console.log('🔍 Verificando credenciales después del OTP...')
        
        // Cerrar sesión temporal del OTP
        await supabase.auth.signOut()
        
        // Intentar login con credenciales
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (loginError) {
          console.log('❌ Error en credenciales:', loginError)
          return {
            success: false,
            message: 'Credenciales incorrectas'
          }
        }

        console.log('✅ Login exitoso después de OTP')
        ToastService.success('¡Bienvenido!', 'Has iniciado sesión correctamente')
        
        return {
          success: true,
          message: 'Login exitoso',
          user: loginData.user
        }
      }

      console.log('✅ OTP verificado exitosamente')
      return {
        success: true,
        message: 'Código verificado correctamente',
        user: data.user || undefined
      }
    } catch (error) {
      console.log('❌ Error inesperado verificando OTP:', error)
      return {
        success: false,
        message: 'Error de conexión verificando código'
      }
    }
  }

  // Validar formato del código OTP
  private isValidOTPFormat(code: string): boolean {
    // Debe ser exactamente 6 dígitos
    const otpRegex = /^\d{6}$/
    return otpRegex.test(code)
  }

  // Reenviar OTP
  async resendOTP(email: string): Promise<AuthResponse> {
    try {
      console.log('🔄 Reenviando OTP a:', email)
      
      // Usar el método sendOTP para reenviar
      const result = await this.sendOTP(email)
      
      if (result.success) {
        return {
          success: true,
          message: 'Código reenviado correctamente'
        }
      }
      
      return result
    } catch (error) {
      console.log('❌ Error reenviando OTP:', error)
      return {
        success: false,
        message: 'Error reenviando código'
      }
    }
  }

  // Obtener perfil del usuario
  async getProfile(): Promise<AuthResponse> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        user: user || undefined
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error obteniendo perfil'
      }
    }
  }

  // Escuchar cambios de autenticación
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null)
    })
  }
}

export default new SupabaseAuthService()
