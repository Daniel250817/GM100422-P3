import Toast from 'react-native-toast-message';

export interface ToastConfig {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

class ToastService {
  // Mostrar toast de éxito
  success(title: string, message?: string, duration: number = 3000) {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
    });
  }

  // Mostrar toast de error
  error(title: string, message?: string, duration: number = 4000) {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
    });
  }

  // Mostrar toast de información
  info(title: string, message?: string, duration: number = 3000) {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
    });
  }

  // Mostrar toast de advertencia
  warning(title: string, message?: string, duration: number = 3000) {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      visibilityTime: duration,
      position: 'top',
    });
  }

  // Mostrar toast personalizado
  show(config: ToastConfig) {
    Toast.show({
      type: config.type,
      text1: config.title,
      text2: config.message,
      visibilityTime: config.duration || 3000,
      position: 'top',
    });
  }

  // Ocultar toast
  hide() {
    Toast.hide();
  }
}

export default new ToastService();
