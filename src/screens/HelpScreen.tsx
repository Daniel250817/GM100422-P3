import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';

interface HelpScreenProps {
  onNavigateBack: () => void;
}

export default function HelpScreen({ onNavigateBack }: HelpScreenProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sections: Array<{ key: string; title: string; icon: keyof typeof Ionicons.glyphMap; content: React.ReactNode }> = [
    {
      key: 'auth_totp',
      title: 'Autenticación: TOTP y OTP',
      icon: 'lock-closed',
      content: (
        <View style={{ gap: 8 }}>
          <Text style={stylesParagraph(theme)}>1) Inicia sesión con tu correo y contraseña.</Text>
          
          <Text style={stylesParagraph(theme)}>2) Métodos de autenticación en dos pasos:</Text>
          
          <Text style={[stylesParagraph(theme), { fontWeight: '600', marginTop: 4 }]}>Método TOTP (Time-based One-Time Password):</Text>
          <View style={{ paddingLeft: 12, gap: 6 }}>
            <Text style={stylesBullet(theme)}>• Abre tu app autenticadora (Google Authenticator, 1Password, Authy).</Text>
            <Text style={stylesBullet(theme)}>• Escanea el código QR que verás en la app o ingresa la clave manualmente.</Text>
            <Text style={stylesBullet(theme)}>• Ingresa el código de 6 dígitos generado para confirmar.</Text>
          </View>
          
          <Text style={[stylesParagraph(theme), { fontWeight: '600', marginTop: 8 }]}>Método OTP (One-Time Password por Email):</Text>
          <View style={{ paddingLeft: 12, gap: 6 }}>
            <Text style={stylesBullet(theme)}>• Solicita el código OTP desde la pantalla de login.</Text>
            <Text style={stylesBullet(theme)}>• Recibirás un código de verificación por SMS o correo electrónico.</Text>
            <Text style={stylesBullet(theme)}>• Ingresa el código recibido para completar la autenticación.</Text>
          </View>
          
          <Text style={stylesParagraph(theme)}>3) En próximos ingresos, después de usuario y contraseña, ingresa el código TOTP o solicita un nuevo OTP.</Text>
          <Text style={stylesHint(theme)}>Tip: TOTP es más seguro y no requiere conexión. OTP es más conveniente pero depende de tu teléfono/correo. Si cambias de teléfono, vuelve a registrar el TOTP desde tu perfil.</Text>
        </View>
      )
    },
    {
      key: 'work_sessions',
      title: 'Cómo funcionan los inicios y cierres de jornada',
      icon: 'time',
      content: (
        <View style={{ gap: 8 }}>
          <Text style={stylesParagraph(theme)}>• Iniciar jornada: desde la pantalla de Jornada de Trabajo, presiona "Iniciar Jornada". Se registra tu hora de entrada.</Text>
          <Text style={stylesParagraph(theme)}>• Terminar jornada: presiona "Terminar Jornada". Se registra la hora de salida y la duración exacta.</Text>
          <Text style={stylesParagraph(theme)}>• Validación de horario: si tienes horario asignado, la app verifica que estés dentro del rango permitido para iniciar.</Text>
          <Text style={stylesHint(theme)}>Nota: La duración mostrada se calcula en tiempo real usando las marcas de tiempo de entrada/salida.</Text>
        </View>
      )
    },
    {
      key: 'schedules',
      title: 'Creación y gestión de horarios',
      icon: 'calendar',
      content: (
        <View style={{ gap: 8 }}>
          <Text style={stylesParagraph(theme)}>• Los horarios definen en qué días y rangos puedes iniciar tu jornada.</Text>
          <Text style={stylesParagraph(theme)}>• Para cada día puedes asignar una hora de inicio y una hora fin, y activarlo/desactivarlo.</Text>
          <Text style={stylesParagraph(theme)}>• La verificación de horario sucede automáticamente al abrir la pantalla de trabajo y cada minuto si no hay sesión activa.</Text>
          <Text style={stylesHint(theme)}>Ejemplo: Lunes a Viernes 09:00–18:00 activado; fines de semana desactivado.</Text>
        </View>
      )
    },
    {
      key: 'routines',
      title: 'Rutinas: medir sub‑tareas dentro de la jornada',
      icon: 'list',
      content: (
        <View style={{ gap: 8 }}>
          <Text style={stylesParagraph(theme)}>• Las rutinas sirven para medir el tiempo de sub‑tareas específicas durante tu jornada.</Text>
          <Text style={stylesParagraph(theme)}>• Puedes iniciarlas y detenerlas independientemente de la jornada para conocer tiempos por actividad.</Text>
          <Text style={stylesParagraph(theme)}>• Útiles para análisis de productividad, estimaciones y reporte de tiempos por tipo de tarea.</Text>
          <Text style={stylesHint(theme)}>Tip: Activa solo una rutina a la vez para comparar tiempos con claridad.</Text>
        </View>
      )
    },
    {
      key: 'statistics',
      title: 'Estadísticas disponibles en la app',
      icon: 'stats-chart',
      content: (
        <View style={{ gap: 8 }}>
          <Text style={stylesParagraph(theme)}>• Total de sesiones y minutos trabajados en el período actual.</Text>
          <Text style={stylesParagraph(theme)}>• Promedio de minutos por sesión.</Text>
          <Text style={stylesParagraph(theme)}>• Evolución de tus tiempos para detectar mejoras o desviaciones.</Text>
          <Text style={stylesHint(theme)}>Nota: Las estadísticas usan la duración final de las sesiones cerradas.</Text>
        </View>
      )
    }
  ];

  const themedStyles = useThemedStyles((t) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 50,
      marginBottom: 12,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: t.colors.primary,
    },
    content: {
      flexGrow: 1,
      padding: 20,
      gap: 12,
    },
    card: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: 14,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    accordionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    accordionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: t.colors.primary,
      flexShrink: 1,
    },
    accordionBody: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
      gap: 6,
    }
  }));

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity style={themedStyles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={themedStyles.title}>Necesitas ayuda</Text>
      </View>

      <ScrollView contentContainerStyle={themedStyles.content}>
        {sections.map((section) => {
          const isOpen = !!expanded[section.key];
          return (
            <View key={section.key} style={themedStyles.card}>
              <TouchableOpacity style={themedStyles.accordionHeader} onPress={() => toggle(section.key)}>
                <View style={themedStyles.accordionLeft}>
                  <Ionicons name={section.icon} size={20} color={theme.colors.primary} />
                  <Text style={themedStyles.accordionTitle}>{section.title}</Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={themedStyles.accordionBody}>
                  {section.content}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function stylesParagraph(theme: any) {
  return {
    color: theme.colors.primary,
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 20,
  } as const;
}

function stylesBullet(theme: any) {
  return {
    color: theme.colors.primary,
    opacity: 0.85,
    fontSize: 14,
    lineHeight: 20,
  } as const;
}

function stylesHint(theme: any) {
  return {
    color: theme.colors.warning,
    fontSize: 13,
    lineHeight: 18,
  } as const;
}


