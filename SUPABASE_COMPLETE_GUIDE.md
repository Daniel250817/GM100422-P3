# 🚀 Guía Completa de Supabase - Esquema Actualizado

## 📋 Tabla de Contenidos

1. [Resumen del Esquema](#resumen-del-esquema)
2. [Configuración Inicial](#configuración-inicial)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Relaciones y Foreign Keys](#relaciones-y-foreign-keys)
5. [Funciones de Base de Datos](#funciones-de-base-de-datos)
6. [Triggers](#triggers)
7. [Row Level Security (RLS)](#row-level-security-rls)
8. [Índices y Optimización](#índices-y-optimización)
9. [Cómo Restaurar la Base de Datos](#cómo-restaurar-la-base-de-datos)
10. [Uso en la Aplicación](#uso-en-la-aplicación)

---

## 📊 Resumen del Esquema

El esquema actual de la base de datos incluye **6 tablas principales**:

1. **`profiles`** - Perfiles de usuario (extiende auth.users)
2. **`settings`** - Configuraciones de usuario
3. **`sesiones_trabajo`** - Sesiones de trabajo registradas
4. **`horarios_asignados`** - Horarios de trabajo semanales
5. **`rutinas`** - Rutinas de trabajo
6. **`chat_history`** - Historial de conversaciones con IA

### Características del Esquema

- ✅ **Row Level Security (RLS)** habilitado en todas las tablas
- ✅ **Triggers automáticos** para actualizar `updated_at`
- ✅ **Creación automática de perfiles** al registrar usuarios
- ✅ **Índices optimizados** para consultas frecuentes
- ✅ **Foreign Keys** con `ON DELETE CASCADE` para integridad referencial

---

## ⚙️ Configuración Inicial

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: `timetrack-mobile`
   - **Región**: Selecciona la más cercana a ti
   - **Contraseña de base de datos**: Guárdala de forma segura

### 2. Obtener Credenciales

1. Ve a **Settings → API** en tu proyecto
2. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Publishable Key**: `sb_publishable_xxx...` (recomendada)
   - O **Anon Key**: `eyJhbGci...` (legacy, funciona pero no recomendada)

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx...
```

### 4. Crear la Base de Datos

1. Ve al **SQL Editor** en Supabase
2. Abre el archivo `supabase-restore-complete.sql`
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Ejecuta el script completo

✅ **¡Listo!** Tu base de datos estará completamente configurada.

---

## 🗄️ Estructura de Base de Datos

### 1. Tabla `profiles`

**Propósito**: Extiende la información de `auth.users` con datos adicionales del perfil.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    nombre TEXT,
    apellido TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Características**:
- Se crea automáticamente cuando un usuario se registra (trigger `handle_new_user`)
- `id` es igual al `id` del usuario en `auth.users`
- No tiene `settings` automáticamente; se crean cuando el usuario las usa por primera vez

**Uso en la App**:
- Muestra información del perfil del usuario
- Permite actualizar nombre, apellido y avatar

---

### 2. Tabla `settings`

**Propósito**: Almacena las preferencias de configuración de cada usuario.

```sql
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT true,
    show_profile_image BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(100) DEFAULT 'America/Mexico_City',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Valores por Defecto**:
- `dark_mode`: `true`
- `show_profile_image`: `true`
- `two_factor_enabled`: `true`
- `notifications_enabled`: `true`
- `language`: `'es'`
- `timezone`: `'America/Mexico_City'`

**Características**:
- Se crea automáticamente cuando el usuario accede a la pantalla de ajustes por primera vez
- **NO** se crea durante el registro (se evita el error de la función `handle_new_user`)
- Un usuario solo puede tener un registro de settings (UNIQUE constraint)

**Uso en la App**:
- `src/hooks/useSettings.ts` gestiona estas configuraciones
- Se crean automáticamente si no existen cuando el usuario abre ajustes

---

### 3. Tabla `sesiones_trabajo`

**Propósito**: Registra las sesiones de trabajo (entrada/salida y duración).

```sql
CREATE TABLE public.sesiones_trabajo (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hora_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_salida TIMESTAMP WITH TIME ZONE,
    duracion_minutos INTEGER,
    notas TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos Clave**:
- `activa`: `true` si la sesión está en curso, `false` si ya finalizó
- `duracion_minutos`: Calculada cuando la sesión se cierra
- `notas`: Texto libre para notas sobre la sesión

**Uso en la App**:
- `SupabaseSessionService` gestiona estas sesiones
- Pantalla `StartWorkScreen` para iniciar/cerrar sesiones

---

### 4. Tabla `horarios_asignados`

**Propósito**: Define los horarios de trabajo semanales del usuario.

```sql
CREATE TABLE public.horarios_asignados (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    dia_nombre VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_minutos INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (hora_fin - hora_inicio))/60
    ) STORED,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos Clave**:
- `dia_semana`: 0 (Domingo) a 6 (Sábado)
- `dia_nombre`: Nombre del día en texto
- `duracion_minutos`: Calculado automáticamente (columna generada)
- `activo`: Permite desactivar horarios sin eliminarlos

**Uso en la App**:
- `SupabaseScheduleService` gestiona estos horarios
- Pantalla `ScheduleManagementScreen` para crear/editar horarios

---

### 5. Tabla `rutinas`

**Propósito**: Almacena rutinas de trabajo personalizadas del usuario.

```sql
CREATE TABLE public.rutinas (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    tiempo_inicio TIMESTAMP WITH TIME ZONE,
    tiempo_total_segundos INTEGER DEFAULT 0,
    completada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos Clave**:
- `tiempo_total_segundos`: Tiempo acumulado de la rutina
- `completada`: Indica si la rutina ha sido completada
- `activa`: Permite desactivar rutinas sin eliminarlas

**Uso en la App**:
- `SupabaseRoutineService` gestiona estas rutinas
- Pantalla `RoutineManagementScreen` para crear/editar rutinas

---

### 6. Tabla `chat_history`

**Propósito**: Almacena el historial de conversaciones con la IA.

```sql
CREATE TABLE public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    intent VARCHAR(50),
    action_type VARCHAR(50),
    action_data JSONB,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos Clave**:
- `role`: 'user' o 'assistant'
- `session_id`: Agrupa mensajes de la misma conversación
- `intent`: Intención detectada (start_routine, create_schedule, etc.)
- `action_type`: Tipo de acción ejecutada
- `action_data`: Datos de la acción en formato JSON
- `response_time_ms`: Tiempo de respuesta en milisegundos
- `tokens_used`: Tokens utilizados (si aplica)

**Uso en la App**:
- `ChatHistoryService` gestiona este historial
- Componente `AIChatModal` para el chat con IA

---

## 🔗 Relaciones y Foreign Keys

Todas las tablas están relacionadas con `auth.users` mediante `user_id`:

```
auth.users
    ├── profiles (id → auth.users.id)
    ├── settings (user_id → auth.users.id)
    ├── sesiones_trabajo (user_id → auth.users.id)
    ├── horarios_asignados (user_id → auth.users.id)
    ├── rutinas (user_id → auth.users.id)
    └── chat_history (user_id → auth.users.id)
```

**Características**:
- **ON DELETE CASCADE**: Si se elimina un usuario, se eliminan todos sus datos relacionados
- Todas las foreign keys están indexadas para mejor rendimiento

---

## ⚙️ Funciones de Base de Datos

### 1. `update_updated_at_column()`

**Propósito**: Actualiza automáticamente `updated_at` en cualquier tabla.

**Usada en**:
- `horarios_asignados`
- `profiles`
- `rutinas`
- `sesiones_trabajo`

### 2. `update_chat_history_updated_at()`

**Propósito**: Actualiza `updated_at` específicamente para `chat_history`.

**Usada en**:
- `chat_history`

### 3. `update_settings_updated_at_column()`

**Propósito**: Actualiza `updated_at` específicamente para `settings`.

**Usada en**:
- `settings`

### 4. `handle_new_user()`

**Propósito**: Se ejecuta automáticamente cuando se registra un nuevo usuario.

**Qué hace**:
1. Crea un registro en `profiles` con nombre y apellido
2. **NO** crea `settings` (para evitar errores)

**Trigger**: `on_auth_user_created` en `auth.users`

---

## 🔔 Triggers

### Triggers de `updated_at`

Todos estos triggers ejecutan sus funciones correspondientes en `BEFORE UPDATE`:

- `trigger_update_chat_history_updated_at` → `chat_history`
- `update_horarios_updated_at` → `horarios_asignados`
- `update_profiles_updated_at` → `profiles`
- `update_rutinas_updated_at` → `rutinas`
- `update_sesiones_updated_at` → `sesiones_trabajo`
- `update_settings_updated_at` → `settings`

### Trigger de Registro de Usuario

- **Nombre**: `on_auth_user_created`
- **Tabla**: `auth.users`
- **Evento**: `AFTER INSERT`
- **Función**: `handle_new_user()`
- **Propósito**: Crear perfil automáticamente al registrar un usuario

---

## 🔒 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Esto significa que:
- Los usuarios **solo pueden ver/modificar sus propios datos**
- Las consultas automáticamente filtran por `user_id`
- **No necesitas** agregar `WHERE user_id = auth.uid()` manualmente

### Políticas RLS Estándar

Cada tabla tiene políticas para:
- **SELECT**: Los usuarios solo pueden ver sus propios registros
- **INSERT**: Los usuarios solo pueden insertar registros con su `user_id`
- **UPDATE**: Los usuarios solo pueden actualizar sus propios registros
- **DELETE**: Los usuarios solo pueden eliminar sus propios registros

### Políticas Especiales

**settings (INSERT)**:
```sql
CREATE POLICY "Users can insert own settings" 
    ON public.settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
```

Permite que la función `handle_new_user()` (con `SECURITY DEFINER`) pueda insertar settings si es necesario.

---

## 📈 Índices y Optimización

### Índices por Tabla

**chat_history**:
- `idx_chat_history_user_id` - Búsquedas por usuario
- `idx_chat_history_session_id` - Agrupar mensajes por sesión
- `idx_chat_history_created_at` - Ordenar por fecha
- `idx_chat_history_intent` - Buscar por intención
- `idx_chat_history_user_session` - Consultas compuestas

**horarios_asignados**:
- `idx_horarios_user_id` - Horarios del usuario
- `idx_horarios_dia_semana` - Filtrar por día
- `idx_horarios_activo` - Solo horarios activos

**rutinas**:
- `idx_rutinas_user_id` - Rutinas del usuario
- `idx_rutinas_activa` - Solo rutinas activas
- `idx_rutinas_completada` - Estado de completado

**sesiones_trabajo**:
- `idx_sesiones_user_id` - Sesiones del usuario
- `idx_sesiones_activa` - Solo sesiones activas
- `idx_sesiones_fecha` - Ordenar por fecha

**settings**:
- `idx_settings_user_id` - Búsqueda rápida por usuario (ya es único, pero indexado)

---

## 🔄 Cómo Restaurar la Base de Datos

Si necesitas restaurar la base de datos completa desde cero:

### Opción 1: Usando el Script de Restauración

1. Ve al **SQL Editor** en Supabase
2. Abre `supabase-restore-complete.sql`
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Ejecuta el script completo

El script incluye:
- ✅ Todas las funciones
- ✅ Todas las secuencias
- ✅ Todas las tablas
- ✅ Todos los constraints (PK, FK, UNIQUE, CHECK)
- ✅ Todos los índices
- ✅ Todos los triggers
- ✅ Habilitación de RLS
- ✅ Todas las políticas RLS

### Opción 2: Usando pg_dump (Backup Completo)

Si tienes un backup completo con datos:

```bash
psql "postgresql://postgres:TU_CONTRASEÑA@db.pnyxgbyjpdzrpgzifise.supabase.co:5432/postgres" < backup-completo.sql
```

---

## 💻 Uso en la Aplicación

### Servicios Disponibles

| Servicio | Tabla | Descripción |
|----------|-------|-------------|
| `SupabaseAuthService` | `auth.users` | Autenticación de usuarios |
| `SettingsService` | `settings` | Configuraciones del usuario |
| `SupabaseSessionService` | `sesiones_trabajo` | Gestión de sesiones de trabajo |
| `SupabaseScheduleService` | `horarios_asignados` | Gestión de horarios |
| `SupabaseRoutineService` | `rutinas` | Gestión de rutinas |
| `ChatHistoryService` | `chat_history` | Historial de chat con IA |

### Hooks Disponibles

- **`useSettings`**: Gestiona configuraciones del usuario
  - Lee/escribe en `settings`
  - Crea settings automáticamente si no existen

### Ejemplo de Uso

```typescript
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';

// Obtener configuraciones
const { settings, loading, toggleDarkMode } = useSettings();

// Insertar sesión de trabajo
const { data, error } = await supabase
  .from('sesiones_trabajo')
  .insert({
    user_id: user.id,
    hora_entrada: new Date().toISOString(),
    activa: true
  });

// RLS automáticamente filtra por user_id
const { data: misSesiones } = await supabase
  .from('sesiones_trabajo')
  .select('*')
  .eq('activa', true);
  // No necesitas .eq('user_id', user.id) porque RLS lo hace automáticamente
```

---

## 🔧 Notas Importantes

### Registro de Usuarios

1. Cuando un usuario se registra:
   - Se crea automáticamente en `auth.users` (Supabase)
   - Se crea automáticamente su perfil en `profiles` (trigger)
   - **NO** se crean `settings` automáticamente
   
2. Las `settings` se crean cuando:
   - El usuario abre la pantalla de ajustes por primera vez
   - El hook `useSettings` detecta que no existen y las crea

### Seguridad

- **Todas las tablas tienen RLS habilitado**
- **Nunca** deshabilites RLS en producción
- Las políticas RLS aseguran que los usuarios solo vean sus datos
- `SECURITY DEFINER` en `handle_new_user()` permite crear perfiles durante el registro

### Mantenimiento

- Los triggers actualizan `updated_at` automáticamente
- Los índices optimizan las consultas frecuentes
- Foreign Keys con `CASCADE` aseguran integridad referencial

---

## 📚 Referencias

- [Documentación Oficial de Supabase](https://supabase.com/docs)
- [Supabase para React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Functions](https://supabase.com/docs/guides/database/functions)

---

**Última actualización**: Basado en el esquema de `supabase-restore-complete.sql`

