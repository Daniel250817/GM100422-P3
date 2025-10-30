# TimeTrack Mobile 📱

**Aplicación móvil de gestión de tiempo y productividad con asistente de IA integrado**

## 📋 Descripción

TimeTrack es una aplicación móvil desarrollada con React Native y Expo que permite gestionar tu tiempo de manera eficiente mediante sesiones de trabajo, rutinas personalizadas y horarios. Incluye un asistente de IA integrado con **Google Gemini** que te ayuda a controlar la aplicación usando lenguaje natural.

## 🚀 Características Principales

### ✨ Funcionalidades Core

- **🔐 Autenticación Segura**
  - Registro e inicio de sesión con Supabase Auth
  - Verificación por OTP (One-Time Password) vía email
  - Autenticación de dos factores (2FA/TOTP) con Google Authenticator
  - Sesiones persistentes con AsyncStorage
  - Logout seguro con confirmación

- **💼 Gestión de Sesiones de Trabajo**
  - Iniciar y finalizar sesiones de trabajo
  - Seguimiento automático del tiempo empleado
  - Sesiones activas en tiempo real
  - Historial completo de jornadas
  - Cálculo automático de duración

- **📅 Gestión de Horarios**
  - Crear horarios personalizados por día de la semana
  - Activar/desactivar horarios
  - Visualización de disponibilidad semanal
  - Horarios recurrentes configurable

- **🔄 Gestión de Rutinas**
  - Crear rutinas personalizadas
  - Activar/desactivar rutinas
  - Contador de completadas
  - Historial de ejecución

- **🤖 Asistente de IA con Gemini**
  - Control por lenguaje natural
  - Respuestas contextuales inteligentes
  - Acciones automáticas
  - Historial de conversaciones en Supabase
  - Análisis de intención avanzado

- **👤 Perfil de Usuario**
  - Avatar personalizable con imagen de perfil
  - Información personal (nombre, apellido, email)
  - Sincronización con Supabase
  - Almacenamiento de avatares en Supabase Storage

- **⚙️ Configuración**
  - Modo claro/oscuro (Dark Mode)
  - Sincronización de tema entre dispositivos
  - Configuración del asistente de IA
  - Preferencias de usuario

## 🛠️ Stack Tecnológico

### Frontend
- **React Native** (v0.81.5)
- **Expo** (v54.0.14)
- **TypeScript** (v5.9.2)
- **React Navigation** (v7.x)
  - Stack Navigator
  - Bottom Tabs

### Backend Serverless (Supabase)
- **PostgreSQL** - Base de datos relacional
- **Supabase Auth** - Autenticación y autorización
- **Supabase Storage** - Almacenamiento de archivos
- **Row Level Security (RLS)** - Seguridad a nivel de fila
- **Funciones de disparo (Triggers)** - Automatización

### IA y Machine Learning
- **Google Gemini** (gemini-2.0-flash-exp)
- **@google/generative-ai** (v0.24.1)

### Almacenamiento Local
- **AsyncStorage** - Persistencia de datos
- **Expo Crypto** - Cifrado y seguridad
- **Secure Store** - Credenciales seguras

### UI/UX
- **React Native Toast Message** - Notificaciones
- **Expo Linear Gradient** - Gradientes visuales
- **@expo/vector-icons** - Iconografía
- **Expo Barcode Scanner** - Lectura de códigos QR (2FA)

---

## 📦 Instalación y Configuración

### Requisitos Previos

- Node.js 18+
- npm o yarn
- Expo CLI
- Cuenta de Supabase
- (Opcional) API Key de Google Gemini

### Paso 1: Clonar e Instalar

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd frontend

# 2. Instalar dependencias
npm install

# 3. Verificar instalación
npm start
```

### Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (`frontend/`):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx...

# Gemini AI Configuration (Opcional)
EXPO_PUBLIC_GEMINI_API_KEY=tu_api_key_de_gemini_aqui
```

**⚠️ Importante:**
- Nunca subas el archivo `.env` a Git
- Asegúrate de que `.env` esté en tu `.gitignore`
- Las variables deben empezar con `EXPO_PUBLIC_` para ser accesibles en el cliente

### Paso 3: Configurar Supabase

#### 3.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: `timetrack-mobile`
   - **Región**: Selecciona la más cercana a ti
   - **Contraseña de base de datos**: Guárdala de forma segura

#### 3.2 Obtener Credenciales

1. Ve a **Settings → API** en tu proyecto
2. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Publishable Key**: `sb_publishable_xxx...` (recomendada)
   - O **Anon Key**: `eyJhbGci...` (legacy, funciona pero no recomendada)
3. Pégala en tu archivo `.env`

#### 3.3 Crear la Base de Datos

1. Ve al **SQL Editor** en Supabase
2. Abre el archivo `supabase-restore-complete.sql`
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Ejecuta el script completo

✅ **¡Listo!** Tu base de datos estará completamente configurada con:
- ✅ Todas las tablas
- ✅ Funciones y triggers
- ✅ Políticas RLS
- ✅ Índices optimizados

#### 3.4 Configurar Storage (Para Avatares)

1. Ve a **Storage** en tu proyecto de Supabase
2. Crea un nuevo bucket:
   - **Nombre**: `avatars`
   - **Público**: No (privado)
3. Configura políticas:
   - Los usuarios solo pueden subir su propio avatar
   - Los avatares son públicos para lectura

---

## 🤖 Configuración del Asistente de IA (Gemini)

### Opción 1: Usando Variables de Entorno (Recomendado)

1. **Obtener API Key de Gemini:**
   - Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Inicia sesión con tu cuenta de Google
   - Haz clic en "Create API Key"
   - Copia la clave generada

2. **Agregar al `.env`:**
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=tu_api_key_de_gemini_aqui
   ```

3. **Reiniciar la aplicación:**
   ```bash
   npx expo start --clear
   ```

✅ **Ventajas:**
- Configuración automática
- No necesitas ingresar la key manualmente
- Switch deshabilitado en la pantalla de configuración

### Opción 2: Configuración Manual en la App

1. Abre la aplicación
2. Ve a **Configuración → Asistente IA**
3. Activa "Usar Google Gemini"
4. Pega tu API key
5. Prueba la conexión

### Costos de Gemini

- **Precio**: Gratis hasta **15 requests/minuto**
- **Uso típico**: Gratis para uso personal
- **Ventajas**: Sin costos, excelente calidad

---

## 🔐 Autenticación: OTP y TOTP

### OTP (One-Time Password)

**¿Qué es?**
- Código de 6 dígitos enviado por email
- Se usa para verificar el email durante login/registro
- Expira después de cierto tiempo

**Flujo:**
1. Usuario intenta login/registro
2. Se envía código OTP por email
3. Usuario ingresa código en la app
4. Si es correcto, se autentica

**Rate Limiting:**
- **6 segundos** entre solicitudes del mismo email
- Si se alcanza el límite, se activa TOTP automáticamente
- Mensaje: "Debes esperar X segundos antes de solicitar otro código"

### TOTP (Time-Based One-Time Password)

**¿Qué es?**
- Código de 6 dígitos que cambia cada 30 segundos
- Generado localmente en el dispositivo
- Compatible con Google Authenticator

**Cuándo se usa:**
1. Cuando OTP no llega por email
2. Cuando hay rate limiting de email
3. Como alternativa más rápida
4. Cuando el usuario tiene 2FA habilitado

**Configuración:**
1. En la pantalla de OTP, presiona "Usar TOTP"
2. Escanea el código QR con Google Authenticator
3. O ingresa el código manualmente
4. El código cambia cada 30 segundos

**Ventajas:**
- ✅ No depende de email
- ✅ Funciona sin conexión
- ✅ Más rápido que OTP
- ✅ Sin rate limiting

---

## 🚀 Uso del Proyecto

### Iniciar la Aplicación

```bash
# Desarrollo (con hot reload)
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

### Estructura de Navegación

```
HomeScreen (Dashboard)
├── StartWorkScreen - Iniciar/cerrar jornada
├── ScheduleManagementScreen - Gestionar horarios
├── RoutineManagementScreen - Gestionar rutinas
├── ProfileScreen - Perfil de usuario
├── SettingsScreen - Configuración
│   └── AIConfigScreen - Configuración de IA
└── StatisticsScreen - Estadísticas
```

### Flujos Principales

#### 1. Registro de Usuario

1. Presiona "Registrarse"
2. Completa nombre, apellido, email y contraseña
3. Recibirás un código OTP por email
4. Ingresa el código para verificar
5. ✅ Se crea automáticamente tu perfil en `profiles`
6. ✅ Se creará `settings` cuando abras la pantalla de ajustes

#### 2. Login

1. Ingresa tu email y contraseña
2. Si tienes 2FA habilitado:
   - Recibirás OTP por email O
   - Usa TOTP si hay rate limiting
3. Ingresa el código de verificación
4. ✅ Accedes al dashboard

#### 3. Iniciar Sesión de Trabajo

1. Ve a "Iniciar Jornada"
2. (Opcional) Agrega notas
3. Presiona "Iniciar"
4. ✅ Se crea una sesión activa en `sesiones_trabajo`
5. El contador empieza a funcionar
6. Para finalizar, presiona "Finalizar"

#### 4. Crear Horario

1. Ve a "Gestión de Horarios"
2. Presiona "Agregar Horario"
3. Selecciona día de la semana
4. Define hora inicio y fin
5. ✅ Se guarda en `horarios_asignados`
6. La duración se calcula automáticamente

#### 5. Crear Rutina

1. Ve a "Gestión de Rutinas"
2. Presiona "Agregar Rutina"
3. Ingresa título y descripción
4. ✅ Se guarda en `rutinas`
5. Puedes iniciar la rutina desde el chat con IA

#### 6. Usar el Chat con IA

1. Presiona el botón de IA en cualquier pantalla
2. Escribe en lenguaje natural:
   - "Inicia mi última rutina"
   - "Crea un horario de trabajo de 9 a 11"
   - "Empieza mi jornada"
   - "¿Cuál fue mi actividad reciente?"
3. La IA entenderá y ejecutará la acción
4. Todo el historial se guarda en `chat_history`

---

## 🤖 Asistente de IA - Guía Completa

### Características

- **Control por Lenguaje Natural**: Escribe comandos como hablarías normalmente
- **Respuestas Contextuales**: La IA conoce tus rutinas, horarios y sesiones
- **Acciones Automáticas**: Puede ejecutar acciones sin que navegues manualmente
- **Historial Persistente**: Todas las conversaciones se guardan en Supabase

### Comandos Disponibles

#### **Rutinas**
```
"Inicia mi última rutina"
"Empieza la rutina de ejercicio"
"¿Cuáles son mis rutinas?"
"Ejecuta la rutina de estudio"
"Termina mi rutina actual"
```

#### **Horarios**
```
"Crea un horario de trabajo"
"Programa mi estudio de 9 a 11"
"Haz un horario para mañana de 14 a 16"
"¿Cuál es mi horario actual?"
"Elimina mi horario del lunes"
```

#### **Jornadas de Trabajo**
```
"Inicia mi jornada"
"Empieza a trabajar en el proyecto X"
"¿Tengo alguna sesión activa?"
"Finaliza mi sesión actual"
"¿Cuánto tiempo trabajé hoy?"
```

#### **Información**
```
"¿Cuál fue mi última actividad?"
"Muéstrame mi progreso"
"Resumen de mi día"
"¿Qué rutinas tengo activas?"
```

### Contexto del Usuario

La IA tiene acceso a:
- ✅ Rutinas disponibles y su estado
- ✅ Horarios configurados
- ✅ Sesiones activas y recientes
- ✅ Historial de actividad
- ✅ Estadísticas de uso

### Integración Técnica

**Archivos principales:**
- `AIChatService.ts` - Servicio principal de IA
- `GeminiService.ts` - Integración con Google Gemini
- `ChatHistoryService.ts` - Gestión del historial
- `AIChatModal.tsx` - Componente del chat

**Flujo de funcionamiento:**
1. Usuario escribe mensaje
2. `AIChatService` analiza la intención con Gemini
3. Se obtiene contexto completo del usuario
4. Gemini genera respuesta inteligente y contextual
5. Se ejecuta acción si es necesario (start_routine, create_schedule, etc.)
6. Todo se guarda en `chat_history` con metadata

---

## 🔧 Solución de Problemas

### OTP No Llega al Email

#### Verificación Rápida:
1. **Revisa la carpeta de spam**
2. **Verifica el email** que ingresaste
3. **Espera 6 segundos** entre solicitudes (rate limiting)

#### Solución Completa:

**1. Configurar SMTP en Supabase:**
   - Ve a **Settings → Auth → SMTP Settings**
   - Habilita "Enable custom SMTP"
   - Configura para Gmail:
     ```
     Host: smtp.gmail.com
     Port: 587
     Username: tu-email@gmail.com
     Password: [contraseña-de-aplicación]
     ```

**2. Verificar Email Templates:**
   - Ve a **Authentication → Email Templates**
   - Verifica que las plantillas estén configuradas

**3. Usar TOTP como Alternativa:**
   - Si OTP no llega, presiona "Usar TOTP"
   - Escanea el código QR con Google Authenticator
   - Usa el código que cambia cada 30 segundos

#### Rate Limiting de OTP

**¿Qué es el Rate Limiting?**
Supabase limita el número de solicitudes de OTP por email para prevenir spam y abuso:
- **6 segundos** entre solicitudes del mismo email
- **Límite diario** por email (varía según el plan)

**Solución Automática Implementada:**
Cuando se alcanza el rate limit, la app automáticamente:
1. ✅ **Detecta el rate limiting**
2. ✅ **Activa TOTP** como alternativa
3. ✅ **Configura TOTP** para verificación
4. ✅ **Informa al usuario** que use TOTP

**Tiempos de Espera:**
- **Rate Limit de 6 segundos:**
  - Espera 6 segundos entre solicitudes
  - Mensaje: "Debes esperar 6 segundos antes de solicitar otro código"
  
- **Rate Limit Excedido:**
  - Espera varios minutos (hasta 1 hora)
  - Se activa TOTP automáticamente
  - Mensaje: "Rate limit alcanzado. Usa TOTP"

**Flujos de la App:**

**Sin Rate Limiting:**
```
Login → OTP enviado por email → Verificar código → Home
```

**Con Rate Limiting (TOTP Automático):**
```
Login → Rate limit detectado → TOTP activado → Verificar código TOTP → Home
```

**Con Rate Limiting (Esperar):**
```
Login → Rate limit detectado → Esperar → Reintentar → OTP enviado → Home
```

**Mejores Prácticas:**

**Para Desarrollo:**
- ✅ Usar TOTP cuando hay rate limiting
- ✅ No hacer muchas pruebas seguidas
- ✅ Usar emails de prueba diferentes

**Para Producción:**
- ✅ Configurar SMTP personalizado (reduce rate limiting)
- ✅ Implementar TOTP como alternativa principal
- ✅ Monitorear límites de uso

**Solución de Problemas Específicos:**

- **"Rate limit exceeded":**
  - Solución: Usar TOTP o esperar
  - Tiempo: 5-60 minutos
  
- **"You must wait X seconds":**
  - Solución: Esperar el tiempo indicado
  - Reintentar: Después del tiempo

- **TOTP no funciona:**
  - Verificar: Que el código sea actual (30 segundos)
  - Regenerar: Presionar "Usar TOTP" nuevamente

**Monitoreo:**
En los logs verás:
```
🔄 Rate limit alcanzado, activando TOTP como alternativa...
TOTP Activado: 123456 (cambia cada 30 segundos)
✅ OTP verificado, usuario autenticado
```

**Indicadores de Rate Limiting:**
- ❌ `email rate limit exceeded`
- ⏰ `you can only request this after X seconds`
- 🔄 `Rate limit alcanzado, activando TOTP`

**Configuración en Supabase:**
1. Ve a **Settings → Auth**
2. Revisa **Rate Limiting** settings
3. **Plan Pro**: Permite configurar límites personalizados
4. **Plan Free**: Límites fijos de Supabase

### Error: "Invalid API key" (Gemini)

1. Verifica que tu API key sea válida
2. Asegúrate de que la key tenga permisos para Gemini
3. Revisa que esté correctamente en el `.env`
4. Reinicia la app con `npx expo start --clear`

### Error: "Database error saving new user"

Este error indica que la función `handle_new_user` tiene problemas. 

**Solución:**
1. Ve al SQL Editor en Supabase
2. Ejecuta el script `supabase-restore-complete.sql` completo
3. Esto actualizará la función `handle_new_user` correctamente

### Settings no se actualizan en la UI

1. Asegúrate de que `useSettings` esté recargando después de cambios
2. Verifica que el hook esté usando `settingsData` del hook
3. Reinicia la pantalla de ajustes

---

## 🏗️ Arquitectura

### Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── AIChatModal.tsx      # Modal de chat con IA
│   │   ├── QRScanner.tsx         # Escáner QR para 2FA
│   │   ├── SimpleSupabaseAuth.tsx # Autenticación Supabase
│   │   ├── TOTPSetupModal.tsx    # Configuración TOTP
│   │   └── ui/                   # Componentes UI básicos
│   │
│   ├── context/             # Context API para estado global
│   │   ├── AuthContext.tsx         # Autenticación
│   │   ├── SupabaseAuthContext.tsx # Auth Supabase
│   │   ├── ThemeContext.tsx        # Tema
│   │   └── NavigationContext.tsx   # Navegación
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── useSettings.ts         # Gestiona configuraciones
│   │   └── useThemedStyles.ts    # Estilos temáticos
│   │
│   ├── interfaces/           # Tipos TypeScript
│   │   ├── Routine.ts
│   │   ├── Schedule.ts
│   │   ├── Session.ts
│   │   └── User.ts
│   │
│   ├── lib/                  # Utilidades
│   │   └── supabase.ts           # Cliente de Supabase
│   │
│   ├── screens/              # Pantallas de la aplicación
│   │   ├── auth/                 # Autenticación
│   │   ├── HomeScreen.tsx         # Dashboard
│   │   ├── StartWorkScreen.tsx   # Iniciar jornada
│   │   ├── ScheduleManagementScreen.tsx
│   │   ├── RoutineManagementScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── AIConfigScreen.tsx
│   │
│   └── services/              # Servicios y lógica de negocio
│       ├── AIChatService.ts         # Servicio principal de IA
│       ├── GeminiService.ts         # Integración con Gemini
│       ├── ChatHistoryService.ts    # Historial de chat
│       ├── SettingsService.ts       # Configuración
│       ├── SupabaseAuthService.ts   # Autenticación
│       ├── SupabaseSessionService.ts  # Sesiones
│       ├── SupabaseScheduleService.ts # Horarios
│       ├── SupabaseRoutineService.ts   # Rutinas
│       └── SupabaseStorageService.ts  # Storage
│
├── .env                      # Variables de entorno (no subir a Git)
├── App.tsx                   # Punto de entrada
├── supabase-restore-complete.sql # Script de restauración de BD
└── package.json
```

### Flujo de Datos

```
Usuario → Pantalla → Servicio → Supabase → Base de Datos
                    ↓
                 Context/Hook
                    ↓
              Actualización de UI
```

---

## 📊 Base de Datos

### Esquema Actual

El proyecto usa **6 tablas principales**:

1. **`profiles`** - Perfiles de usuario (extiende auth.users)
2. **`settings`** - Configuraciones de usuario
3. **`sesiones_trabajo`** - Sesiones de trabajo registradas
4. **`horarios_asignados`** - Horarios de trabajo semanales
5. **`rutinas`** - Rutinas de trabajo
6. **`chat_history`** - Historial de conversaciones con IA

#### Estructura de `chat_history`

La tabla `chat_history` almacena todo el historial de conversaciones con el asistente de IA:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del mensaje (PK) |
| `user_id` | UUID | ID del usuario (FK a auth.users) |
| `session_id` | UUID | ID de la sesión de chat (agrupa mensajes) |
| `role` | VARCHAR(20) | Rol: 'user' o 'assistant' |
| `content` | TEXT | Contenido del mensaje |
| `intent` | VARCHAR(50) | Intención detectada por la IA |
| `action_type` | VARCHAR(50) | Tipo de acción ejecutada |
| `action_data` | JSONB | Datos de la acción en formato JSON |
| `response_time_ms` | INTEGER | Tiempo de respuesta en milisegundos |
| `tokens_used` | INTEGER | Tokens utilizados (para facturación) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Fecha de creación |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Fecha de última actualización |

**Índices:**
- `idx_chat_history_user_id` - Búsquedas por usuario
- `idx_chat_history_session_id` - Búsquedas por sesión
- `idx_chat_history_created_at` - Ordenamiento temporal
- `idx_chat_history_intent` - Análisis de intenciones
- `idx_chat_history_user_session` - Consultas frecuentes (compuesto)

**Uso en la Aplicación:**

El servicio `ChatHistoryService` gestiona automáticamente:
- Guarda todos los mensajes del usuario y del asistente
- Registra métricas de rendimiento (tiempo de respuesta, tokens)
- Mantiene el contexto de la conversación
- Permite análisis de patrones de uso

**Ejemplo de consultas útiles:**

```sql
-- Obtener historial de una sesión
SELECT * FROM chat_history 
WHERE user_id = auth.uid() 
AND session_id = 'session-uuid'
ORDER BY created_at ASC;

-- Intenciones más comunes
SELECT intent, COUNT(*) as count
FROM chat_history 
WHERE user_id = auth.uid()
AND intent IS NOT NULL
GROUP BY intent
ORDER BY count DESC;

-- Estadísticas del usuario
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
  AVG(response_time_ms) as avg_response_time,
  SUM(tokens_used) as total_tokens
FROM chat_history 
WHERE user_id = auth.uid()
AND created_at >= NOW() - INTERVAL '30 days';
```

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:
- Los usuarios solo pueden ver/modificar sus propios datos
- No necesitas agregar `WHERE user_id = auth.uid()` manualmente
- Las políticas RLS lo hacen automáticamente

### Características

- ✅ **Foreign Keys** con `ON DELETE CASCADE`
- ✅ **Triggers automáticos** para `updated_at`
- ✅ **Índices optimizados** para consultas frecuentes
- ✅ **Creación automática de perfiles** al registrar usuarios

**📖 Para más detalles sobre el esquema, consulta [SUPABASE_COMPLETE_GUIDE.md](./SUPABASE_COMPLETE_GUIDE.md)**

---

## 📦 Generar APK

### Instalación de EAS CLI

```bash
npm install -g eas-cli
```

### Configuración

```bash
eas build:configure
```

### Build de Producción

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

El APK/IPA se generará en la nube y te llegará un enlace para descargarlo.

---

## 📖 Documentación Adicional

- **[SUPABASE_COMPLETE_GUIDE.md](./SUPABASE_COMPLETE_GUIDE.md)** - **Guía completa de Supabase y esquema de base de datos** 🗄️
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Diagrama completo de infraestructura en la nube 🏗️

---

## 🔒 Seguridad

### Autenticación Multi-Factor

1. **Login con Email/Password**
   - Verificación de credenciales
   - Validación de usuario

2. **OTP (One-Time Password)**
   - Enviado por email
   - 6 dígitos
   - Expiración automática
   - Rate limiting: 1 código cada 6 segundos

3. **TOTP (Time-Based One-Time Password)**
   - Compatible con Google Authenticator
   - QR Code para configuración
   - Código cambia cada 30 segundos
   - Funciona sin conexión a internet

### Protección de Datos

- **RLS**: Todos los datos protegidos a nivel de base de datos
- **AsyncStorage**: Persistencia local segura
- **Supabase Auth**: JWT con expiración automática
- **Encriptación**: Crypto-JS para datos sensibles

---

## 🎯 Estado Actual

### ✅ Funcionalidades Implementadas

- ✅ Registro y login de usuarios
- ✅ Verificación por OTP
- ✅ Autenticación 2FA/TOTP
- ✅ Gestión de sesiones de trabajo
- ✅ Gestión de horarios
- ✅ Gestión de rutinas
- ✅ Chat con IA usando Gemini
- ✅ Historial de conversaciones
- ✅ Perfil de usuario con avatar
- ✅ Modo claro/oscuro
- ✅ Notificaciones toast
- ✅ Navegación completa

### 🔄 En Desarrollo

- 🔄 Estadísticas avanzadas
- 🔄 Exportación de datos
- 🔄 Notificaciones push
- 🔄 Sincronización offline


---

## 📄 Licencia

Este proyecto es publico con licencia MIT y propiedad de Daniel250817 (User Gihub).

## 👤 Autor

**Julio Daniel Guardado Martínez** - *Desarrollador Principal*

---

**TimeTrack** - Gestiona tu tiempo de manera inteligente con IA 🤖
