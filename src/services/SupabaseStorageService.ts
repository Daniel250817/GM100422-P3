import { supabase } from '../lib/supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class SupabaseStorageService {
  private bucketName = 'ProfilesImages';

  /**
   * Sube una imagen al storage de Supabase
   */
  async uploadAvatar(file: any, userId: string): Promise<UploadResult> {
    try {
      // Generar nombre único para el archivo
      const fileExt = file.uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Estructura: userId/filename
      
      console.log('Subiendo archivo:', {
        bucketName: this.bucketName,
        filePath: filePath,
        fileName: fileName,
        userId: userId
      });

      // Leer el archivo como ArrayBuffer para React Native
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Subir archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: `image/${fileExt}`
        });

      if (error) {
        console.log('Error subiendo archivo:', error);
        console.log('Detalles del error:', {
          message: error.message,
          name: error.name
        });
        return {
          success: false,
          error: error.message
        };
      }

      console.log('Archivo subido exitosamente:', {
        path: data.path,
        id: data.id,
        fullPath: data.fullPath
      });

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      console.log('URL generada:', {
        filePath: filePath,
        publicUrl: urlData.publicUrl,
        bucketName: this.bucketName
      });


      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.log('Error en uploadAvatar:', error);
      return {
        success: false,
        error: 'Error inesperado al subir la imagen'
      };
    }
  }

  /**
   * Elimina un avatar del storage
   */
  async deleteAvatar(filePath: string): Promise<UploadResult> {
    try {
      // Extraer el path del archivo de la URL completa
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const userId = pathParts[pathParts.length - 2];
      const fullPath = `${userId}/${fileName}`; // Estructura: userId/filename

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fullPath]);

      if (error) {
        console.log('Error eliminando archivo:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.log('Error en deleteAvatar:', error);
      return {
        success: false,
        error: 'Error inesperado al eliminar la imagen'
      };
    }
  }

  /**
   * Verifica si el bucket existe y tiene los permisos correctos
   */
  async checkBucketAccess(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error) {
        console.log('Error verificando bucket:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.log('Error en checkBucketAccess:', error);
      return false;
    }
  }

  /**
   * Verifica si un archivo existe en el storage
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(filePath.split('/')[0], { 
          search: filePath.split('/')[1] 
        });

      if (error) {
        console.log('Error verificando archivo:', error);
        return false;
      }

      const exists = data && data.length > 0;
      console.log('Archivo existe:', { filePath, exists, data });
      return exists;
    } catch (error) {
      console.log('Error en checkFileExists:', error);
      return false;
    }
  }
}

export default new SupabaseStorageService();
