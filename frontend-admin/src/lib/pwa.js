import { useCallback, useEffect, useState } from 'react';

/**
 * PWA del Admin: registro del service worker e instalación.
 *  - Android y escritorio (Chrome/Edge): `beforeinstallprompt` permite instalar con un botón.
 *  - iPhone/iPad (Safari): no existe ese evento; se muestran las instrucciones ("Compartir" > "Agregar a inicio").
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const url = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL }).catch((e) => {
      console.warn('[PWA] No se pudo registrar el service worker:', e);
    });
  });
}

let deferredPrompt = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
    return choice.outcome; // 'accepted' | 'dismissed'
  }, []);

  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferredPrompt),
    ios: isIOS() && !isStandalone(),
    promptInstall
  };
}
