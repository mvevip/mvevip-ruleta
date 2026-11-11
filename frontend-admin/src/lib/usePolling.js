import { useEffect, useRef } from 'react';

/**
 * Ejecuta `fn` cada `ms` milisegundos SOLO mientras la pestaña está visible, y una vez al volver a verla.
 * Evita consultas inútiles al servidor cuando el Admin está en segundo plano.
 */
export default function usePolling(fn, ms) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);

  useEffect(() => {
    let id = null;
    const start = () => { if (id === null) id = setInterval(() => saved.current(), ms); };
    const stop = () => { if (id !== null) { clearInterval(id); id = null; } };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { saved.current(); start(); } else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [ms]);
}
