import { useState, useEffect, useRef, useCallback } from 'react';

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);

const API_URL = isProduction
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5500` : 'http://localhost:5500');

export default function useRemoteDisplaySync(screenKey = 'roulette', socket = null) {
  const [displayConfig, setDisplayConfig] = useState({
    orientation: 'auto',
    slide_duration: 8,
    layout_ratio: '55/45'
  });
  const [sliderImages, setSliderImages] = useState([]);
  const [lastVersion, setLastVersion] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const isFetchingRef = useRef(false);

  // Cargar datos completos (configuraciones e imágenes)
  const refreshAllData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // 1. Obtener configuraciones de pantallas
      const resConfig = await fetch(`${API_URL}/api/displays/config`);
      if (resConfig.ok) {
        const jsonConfig = await resConfig.json();
        if (jsonConfig.success && jsonConfig.configs) {
          const myConfig = jsonConfig.configs[screenKey] || {
            orientation: 'auto',
            slide_duration: 8,
            layout_ratio: '55/45'
          };
          setDisplayConfig(myConfig);
          if (jsonConfig.version) setLastVersion(jsonConfig.version);
        }
      }

      // 2. Si la pantalla utiliza slider (slider o combo), cargar imágenes activas
      if (screenKey === 'slider' || screenKey === 'combo') {
        const resImages = await fetch(`${API_URL}/api/displays/slider-images`);
        if (resImages.ok) {
          const jsonImages = await resImages.json();
          if (jsonImages.success && Array.isArray(jsonImages.images)) {
            setSliderImages(jsonImages.images);
          }
        }
      }

      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn('[useRemoteDisplaySync] Error actualizando datos remotos:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [screenKey]);

  // Carga inicial al montar
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // 1. Escuchar eventos Socket.io si están disponibles
  useEffect(() => {
    if (!socket) return;

    const handleRemoteReload = (data) => {
      console.log('[useRemoteDisplaySync] Recibido ADMIN_REMOTE_RELOAD por socket:', data);
      if (data?.action === 'FORCE_RELOAD') {
        window.location.reload();
      } else {
        refreshAllData();
      }
    };

    socket.on('ADMIN_REMOTE_RELOAD', handleRemoteReload);
    return () => {
      socket.off('ADMIN_REMOTE_RELOAD', handleRemoteReload);
    };
  }, [socket, refreshAllData]);

  // 2. Polling ultra ligero de verificación de versión cada 3.5 segundos
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/displays/sync`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.version) {
          // Si es la primera versión detectada
          if (lastVersion === 0) {
            setLastVersion(data.version);
            return;
          }

          // Si el servidor emitió una nueva versión
          if (data.version > lastVersion) {
            console.log(`[useRemoteDisplaySync] Nueva versión detectada: ${data.version} vs anterior: ${lastVersion}`);
            setLastVersion(data.version);

            if (data.action === 'FORCE_RELOAD') {
              console.log('[useRemoteDisplaySync] Ejecutando recarga forzada...');
              window.location.reload();
            } else {
              refreshAllData();
            }
          }
        }
      } catch (_) {
        // Silenciar errores de red intermitentes en la feria
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [lastVersion, refreshAllData]);

  return {
    displayConfig,
    sliderImages,
    lastSyncTime,
    refreshAllData,
    apiUrl: API_URL
  };
}
