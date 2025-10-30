import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  fallbackIcon?: string;
  fallbackIconSize?: number;
  style?: any;
}

// Cache en memoria para rastrear imágenes cargadas por identificador único
const imageCache = new Map<string, { loaded: boolean; timestamp: number; imageKey: string }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Limpiar caché antiguo periódicamente
const cleanCache = () => {
  const now = Date.now();
  for (const [key, data] of imageCache.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      imageCache.delete(key);
    }
  }
};

// Ejecutar limpieza cada hora
setInterval(cleanCache, 60 * 60 * 1000);

// Normalizar URL: quitar parámetros de caché, query strings, etc. para crear un identificador único
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remover query parameters y hash
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    // Si no es una URL válida, intentar remover parámetros manualmente
    return url.split('?')[0].split('#')[0];
  }
}

// Generar identificador único desde la URL normalizada
function generateImageId(uri: string): string {
  const normalized = normalizeUrl(uri);
  // Crear un hash simple de la URL normalizada
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit integer
  }
  return `${Math.abs(hash).toString(16)}_${normalized.length}`;
}

// Almacenar sources estables globalmente para evitar recreaciones
const stableSourcesCache = new Map<string, { uri: string }>();

function CachedImageComponent({
  source,
  fallbackIcon = 'person',
  fallbackIconSize = 40,
  style,
  ...props
}: CachedImageProps) {
  const { theme } = useTheme();
  const imageKeyRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [imageError, setImageError] = useState(false);
  const isNumberSource = typeof source === 'number';

  // Obtener URI y generar identificador único
  const uri = isNumberSource ? null : (source as { uri: string }).uri;
  const imageId = useMemo(() => uri ? generateImageId(uri) : null, [uri]);

  // Crear o obtener source estable del caché global
  const stableSource = useMemo(() => {
    if (!uri || !imageId) return null;
    // Usar caché global para mantener la misma referencia
    if (!stableSourcesCache.has(imageId)) {
      stableSourcesCache.set(imageId, { uri });
    }
    return stableSourcesCache.get(imageId)!;
  }, [uri, imageId]);

  // Verificar inmediatamente si está en caché al montar
  const isCachedOnMount = useMemo(() => {
    if (!imageId) return false;
    const cached = imageCache.get(imageId);
    return cached && cached.loaded;
  }, [imageId]);

  // Estado inicial: si está en caché, no mostrar loading
  const [isLoading, setIsLoading] = useState(() => {
    if (isCachedOnMount) {
      hasLoadedOnceRef.current = true;
      imageKeyRef.current = imageId;
      return false;
    }
    return true;
  });

  // Si está en caché al montar, inicializar refs
  if (isCachedOnMount && imageId && uri && !hasLoadedOnceRef.current) {
    imageKeyRef.current = imageId;
    hasLoadedOnceRef.current = true;
  }

  // Verificar si el identificador ha cambiado
  const idChanged = imageId !== null && imageId !== imageKeyRef.current;

  useEffect(() => {
    if (!uri || !imageId) {
      setIsLoading(false);
      return;
    }

    // Si el identificador cambió, es una imagen nueva
    if (idChanged) {
      const cached = imageCache.get(imageId);
      if (cached && cached.loaded) {
        // Ya está en caché - no recargar
        setIsLoading(false);
        setImageError(false);
        imageKeyRef.current = imageId;
        hasLoadedOnceRef.current = true;
        return;
      }
      
      // Nueva imagen - necesita cargar
      setIsLoading(true);
      setImageError(false);
      hasLoadedOnceRef.current = false;
    } else if (!idChanged && imageId === imageKeyRef.current) {
      // Misma imagen - mantener estado cargado
      setIsLoading(false);
      setImageError(false);
    }
  }, [uri, imageId, idChanged]);

  // Si es fuente local (number), renderizar directamente
  if (isNumberSource) {
    return <Image source={source as number} style={style} {...props} />;
  }

  // Si no hay URI, mostrar fallback
  if (!uri || !imageId) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Ionicons 
          name={fallbackIcon as any} 
          size={fallbackIconSize} 
          color={theme.colors.primary} 
        />
      </View>
    );
  }

  // Verificar si ya está en caché y cargada
  const cached = imageCache.get(imageId!);
  const isCachedAndLoaded = cached && cached.loaded;
  
  // Si ya está cargada en el caché global, mostrar sin handlers (IMPORTANTE: sin onLoad/onError)
  // Esto previene que React Native recargue la imagen al remontar
  if (isCachedAndLoaded && stableSource) {
    // Componente Image "congelado" - sin handlers, sin recargas
    // La key estable permite que React Native reutilice la imagen del caché nativo
    return (
      <Image
        {...props}
        source={stableSource}
        style={style}
        key={`cached_img_${imageId}`}
        // CRÍTICO: Sin handlers - cualquier handler puede causar que React Native recargue
      />
    );
  }

  // Si está cargando o no está en caché, mostrar con handlers para cargar
  if (isLoading || !isCachedAndLoaded) {
    return (
      <View style={style}>
        {isLoading && (
          <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
        <Image
          {...props}
          source={stableSource || { uri: uri! }}
          style={[style, isLoading && styles.hidden]}
          key={`loading_${imageId}`}
          onLoadStart={() => {
            setIsLoading(true);
            setImageError(false);
          }}
          onLoad={() => {
            setIsLoading(false);
            setImageError(false);
            imageKeyRef.current = imageId;
            hasLoadedOnceRef.current = true;
            // Guardar en caché
            imageCache.set(imageId!, { 
              loaded: true, 
              timestamp: Date.now(),
              imageKey: imageId!
            });
          }}
          onError={(error) => {
            console.log('Error cargando imagen:', imageId, uri, error.nativeEvent.error);
            setIsLoading(false);
            setImageError(true);
            imageCache.set(imageId!, { 
              loaded: false, 
              timestamp: Date.now(),
              imageKey: imageId!
            });
          }}
        />
      </View>
    );
  }

  // Si hay error, mostrar fallback
  if (imageError) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Ionicons 
          name={fallbackIcon as any} 
          size={fallbackIconSize} 
          color={theme.colors.primary} 
        />
      </View>
    );
  }

  // Fallback por defecto (no debería llegar aquí normalmente)
  return (
    <View style={[style, styles.fallbackContainer]}>
      <Ionicons 
        name={fallbackIcon as any} 
        size={fallbackIconSize} 
        color={theme.colors.primary} 
      />
    </View>
  );
}

// Memoizar el componente con comparación estricta
const CachedImageMemo = React.memo(CachedImageComponent, (prevProps, nextProps) => {
  // Si las referencias son iguales, definitivamente no re-renderizar
  if (prevProps.source === nextProps.source) {
    return true;
  }
  
  // Comparar las URLs normalizadas
  const prevUri = typeof prevProps.source === 'number' ? null : prevProps.source.uri;
  const nextUri = typeof nextProps.source === 'number' ? null : nextProps.source.uri;
  
  if (prevUri === nextUri) {
    // Misma URL, no re-renderizar
    return true;
  }
  
  if (!prevUri || !nextUri) {
    return prevUri === nextUri;
  }
  
  // Comparar identificadores únicos
  const prevId = generateImageId(prevUri);
  const nextId = generateImageId(nextUri);
  
  // Si el identificador es el mismo, no re-renderizar
  if (prevId === nextId) {
    // Verificar si ambos sources están en el stableSourcesCache
    const prevStable = stableSourcesCache.get(prevId);
    const nextStable = stableSourcesCache.get(nextId);
    
    // Si ambos existen y tienen la misma referencia, definitivamente no re-renderizar
    if (prevStable && nextStable && prevStable === nextStable) {
      return true;
    }
  }
  
  return prevId === nextId;
});

export default CachedImageMemo;

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  hidden: {
    opacity: 0,
  },
});


