import React, { useEffect, useRef } from 'react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export default function TurnstileWidget({ onVerify, onError }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // Si no hay Site Key en .env, operamos en modo bypass transparente
    if (!TURNSTILE_SITE_KEY) {
      onVerify('BYPASS_DEV');
      return;
    }

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token) => {
              onVerify(token);
            },
            'error-callback': () => {
              console.warn('[Turnstile] Error en la validación.');
              if (onError) onError();
            },
            theme: 'dark',
            size: 'flexible'
          });
        } catch (e) {
          console.warn('[Turnstile] Error al inicializar widget:', e);
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const timer = setInterval(() => {
        if (window.turnstile) {
          renderWidget();
          clearInterval(timer);
        }
      }, 250);
      return () => clearInterval(timer);
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {}
      }
    };
  }, [onVerify, onError]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="w-full flex justify-center my-3 min-h-[65px]">
      <div ref={containerRef} className="rounded-xl overflow-hidden shadow-lg border border-zinc-800" />
    </div>
  );
}
