-- ============================================================================
-- SCRIPT COMPLETO DE RESTAURACIÓN DE BASE DE DATOS
-- Copia y pega este contenido completo en tu gestor de PostgreSQL
-- Este script recrea TODO el esquema de tu base de datos Supabase
-- ============================================================================

-- ============================================================================
-- 1. FUNCIONES (Deben crearse primero porque los triggers las necesitan)
-- ============================================================================

-- Función para actualizar updated_at en todas las tablas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Función para actualizar updated_at en chat_history
CREATE OR REPLACE FUNCTION public.update_chat_history_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función para actualizar updated_at en settings
CREATE OR REPLACE FUNCTION public.update_settings_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- SOLO crear perfil - SIN settings (settings se crearán después desde la app)
  INSERT INTO public.profiles (id, nombre, apellido)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''), 
    COALESCE(NEW.raw_user_meta_data->>'apellido', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- NO crear settings aquí - se crearán automáticamente cuando el usuario las use
  -- gracias al código en useSettings.ts que detecta cuando no existen y las crea
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. SECUENCIAS (Para campos SERIAL)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.horarios_asignados_id_seq 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 2147483647 
    START WITH 1 
    NO CYCLE 
    OWNED BY public.horarios_asignados.id;

CREATE SEQUENCE IF NOT EXISTS public.rutinas_id_seq 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 2147483647 
    START WITH 1 
    NO CYCLE 
    OWNED BY public.rutinas.id;

CREATE SEQUENCE IF NOT EXISTS public.sesiones_trabajo_id_seq 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 2147483647 
    START WITH 1 
    NO CYCLE 
    OWNED BY public.sesiones_trabajo.id;

-- ============================================================================
-- 3. TABLAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    session_id UUID DEFAULT gen_random_uuid() NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.horarios_asignados (
    id SERIAL NOT NULL,
    user_id UUID NOT NULL,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    dia_nombre VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_minutos INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (hora_fin - hora_inicio))/60) STORED,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL,
    avatar_url TEXT,
    nombre TEXT,
    apellido TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rutinas (
    id SERIAL NOT NULL,
    user_id UUID NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    tiempo_inicio TIMESTAMP WITH TIME ZONE,
    tiempo_total_segundos INTEGER DEFAULT 0,
    completada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sesiones_trabajo (
    id SERIAL NOT NULL,
    user_id UUID NOT NULL,
    hora_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    hora_salida TIMESTAMP WITH TIME ZONE,
    duracion_minutos INTEGER,
    notas TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL UNIQUE,
    dark_mode BOOLEAN DEFAULT true,
    show_profile_image BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(100) DEFAULT 'America/Mexico_City',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. PRIMARY KEYS
-- ============================================================================

ALTER TABLE public.chat_history ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);
ALTER TABLE public.horarios_asignados ADD CONSTRAINT horarios_asignados_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.rutinas ADD CONSTRAINT rutinas_pkey PRIMARY KEY (id);
ALTER TABLE public.sesiones_trabajo ADD CONSTRAINT sesiones_trabajo_pkey PRIMARY KEY (id);
ALTER TABLE public.settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

-- ============================================================================
-- 5. FOREIGN KEYS
-- ============================================================================

ALTER TABLE public.chat_history 
    ADD CONSTRAINT chat_history_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.horarios_asignados 
    ADD CONSTRAINT horarios_asignados_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rutinas 
    ADD CONSTRAINT rutinas_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.sesiones_trabajo 
    ADD CONSTRAINT sesiones_trabajo_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.settings 
    ADD CONSTRAINT settings_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 6. ÍNDICES (Para optimización)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON public.chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_intent ON public.chat_history(intent);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON public.chat_history(user_id, session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_horarios_user_id ON public.horarios_asignados(user_id);
CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON public.horarios_asignados(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_activo ON public.horarios_asignados(activo);

CREATE INDEX IF NOT EXISTS idx_rutinas_user_id ON public.rutinas(user_id);
CREATE INDEX IF NOT EXISTS idx_rutinas_activa ON public.rutinas(activa);
CREATE INDEX IF NOT EXISTS idx_rutinas_completada ON public.rutinas(completada);

CREATE INDEX IF NOT EXISTS idx_sesiones_user_id ON public.sesiones_trabajo(user_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON public.sesiones_trabajo(activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON public.sesiones_trabajo(hora_entrada);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- ============================================================================
-- 7. TRIGGERS (Para actualizar updated_at automáticamente)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_chat_history_updated_at ON public.chat_history;
CREATE TRIGGER trigger_update_chat_history_updated_at 
    BEFORE UPDATE ON public.chat_history 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_chat_history_updated_at();

DROP TRIGGER IF EXISTS update_horarios_updated_at ON public.horarios_asignados;
CREATE TRIGGER update_horarios_updated_at 
    BEFORE UPDATE ON public.horarios_asignados 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rutinas_updated_at ON public.rutinas;
CREATE TRIGGER update_rutinas_updated_at 
    BEFORE UPDATE ON public.rutinas 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sesiones_updated_at ON public.sesiones_trabajo;
CREATE TRIGGER update_sesiones_updated_at 
    BEFORE UPDATE ON public.sesiones_trabajo 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON public.settings 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_settings_updated_at_column();

-- Trigger para crear perfil automáticamente cuando se registra un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. POLÍTICAS RLS
-- ============================================================================
-- NOTA: Necesitarás ejecutar estas políticas según tus necesidades específicas
-- Aquí van ejemplos generales, ajusta según tus políticas actuales

-- Políticas para chat_history
CREATE POLICY "Users can view their own chat history" 
    ON public.chat_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat history" 
    ON public.chat_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat history" 
    ON public.chat_history FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history" 
    ON public.chat_history FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para horarios_asignados
CREATE POLICY "Users can view own schedules" 
    ON public.horarios_asignados FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules" 
    ON public.horarios_asignados FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" 
    ON public.horarios_asignados FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" 
    ON public.horarios_asignados FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Políticas para rutinas
CREATE POLICY "Users can view own routines" 
    ON public.rutinas FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines" 
    ON public.rutinas FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines" 
    ON public.rutinas FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines" 
    ON public.rutinas FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para sesiones_trabajo
CREATE POLICY "Users can view own sessions" 
    ON public.sesiones_trabajo FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
    ON public.sesiones_trabajo FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
    ON public.sesiones_trabajo FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
    ON public.sesiones_trabajo FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para settings
CREATE POLICY "Users can view own settings" 
    ON public.settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
    ON public.settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
    ON public.settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own settings" 
    ON public.settings FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

