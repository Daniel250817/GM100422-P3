import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SupabaseAuthService from '../services/SupabaseAuthService';
import { UserModel } from '../models/UserModel';
import { User } from '../interfaces/User';

interface AuthContextType {
  user: UserModel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; expiresAt?: string; twoFactorEnabled?: boolean }>;
  verifyOTP: (email: string, code: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  resendOTP: (email: string) => Promise<{ success: boolean; message?: string; expiresAt?: string }>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  }) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ignoreAuthChanges, setIgnoreAuthChanges] = useState<boolean>(false);

  const authService = SupabaseAuthService;

  // Verificar autenticación al cargar la app y escuchar cambios
  useEffect(() => {
    checkAuthStatus();
    
    // Escuchar cambios de autenticación de Supabase
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      console.log('🔄 Auth state changed:', { user: !!user, isAuthenticated, ignoreAuthChanges });
      
      // Ignorar cambios temporales durante el proceso de login
      if (ignoreAuthChanges) {
        console.log('⏭️ Ignorando cambio de auth (proceso de login)');
        return;
      }
      
      if (user) {
        // Usuario detectado - cargar datos pero NO establecer isAuthenticated aún
        // porque puede necesitar verificación OTP
        const userData = {
          id: user.id, // Usar UUID directamente de Supabase
          email: user.email || '',
          nombre: user.user_metadata?.nombre || '',
          apellido: user.user_metadata?.apellido || '',
          activo: 'si' as 'si' | 'no',
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString()
        };
        const userModel = new UserModel(userData);
        setUser(userModel);
        // NO establecer isAuthenticated aquí - se establecerá después de OTP
        console.log('✅ User data loaded via listener (waiting for OTP verification)');
      } else {
        // Usuario no autenticado
        setUser(null);
        setIsAuthenticated(false);
        console.log('❌ User logged out via listener');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // Convertir User de Supabase a UserModel
          const userData = {
            id: currentUser.id, // Usar UUID directamente de Supabase
            email: currentUser.email || '',
            nombre: currentUser.user_metadata?.nombre || '',
            apellido: currentUser.user_metadata?.apellido || '',
            activo: 'si' as 'si' | 'no',
            created_at: currentUser.created_at || new Date().toISOString(),
            updated_at: currentUser.updated_at || new Date().toISOString()
          };
          const userModel = new UserModel(userData);
          setUser(userModel);
          setIsAuthenticated(true);
        } else {
          // Token válido pero no hay datos de usuario, refrescar
          await refreshUser();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Error verificando autenticación:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; expiresAt?: string; twoFactorEnabled?: boolean }> => {
    try {
      // Activar bandera para ignorar cambios temporales de auth INMEDIATAMENTE
      setIgnoreAuthChanges(true);
      console.log('🔒 Activando bandera para ignorar cambios de auth');
      
      const result = await authService.login(email, password);
      
      // Desactivar bandera después de un delay más largo
      setTimeout(() => {
        setIgnoreAuthChanges(false);
        console.log('🔓 Desactivando bandera para ignorar cambios de auth');
      }, 5000);
      
      return result;
    } catch (error) {
      // Desactivar bandera en caso de error
      setIgnoreAuthChanges(false);
      console.log('🔓 Desactivando bandera por error');
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  };

  const verifyOTP = async (email: string, code: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await authService.verifyOTP(email, code, password);
      
      if (result.success) {
        // Establecer como autenticado después de verificar OTP
        setIsAuthenticated(true);
        console.log('✅ OTP verificado, usuario autenticado');
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  };

  const resendOTP = async (email: string): Promise<{ success: boolean; message?: string; expiresAt?: string }> => {
    try {
      const result = await authService.resendOTP(email);
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  };


  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Iniciando logout...');
      
      // Forzar logout local inmediatamente para UI responsiva
      setUser(null);
      setIsAuthenticated(false);
      
      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await authService.logout();
      console.log('📋 Resultado del logout:', result);
      
      if (result.success) {
        console.log('✅ Logout exitoso');
        // Asegurar que el estado esté limpio
        setUser(null);
        setIsAuthenticated(false);
      } else {
        console.log('❌ Error en logout:', result.message);
        // Asegurar que el estado esté limpio incluso si falla
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('❌ Error en logout:', error);
      // Asegurar que el estado esté limpio en caso de error
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await authService.register(userData);
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const result = await authService.getProfile();
      if (result.success && result.user) {
        // El listener de auth state change se encargará de actualizar el estado
        console.log('✅ Perfil obtenido, el listener se encargará de actualizar el estado');
      } else {
        // Si no se puede obtener el perfil, hacer logout
        console.log('❌ No se pudo obtener el perfil, forzando logout');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Error refrescando usuario:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const setAuthenticated = (authenticated: boolean) => {
    console.log('🔐 Estableciendo estado de autenticación:', authenticated);
    setIsAuthenticated(authenticated);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    verifyOTP,
    resendOTP,
    logout,
    register,
    refreshUser,
    setAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
