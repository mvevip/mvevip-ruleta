import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import KioskButtonApp from './components/KioskButtonApp';
import './index.css';
import './brand-ford.css';
import { getScreenBrandConfig } from './brand';

const brandConfig = getScreenBrandConfig();
if (typeof document !== 'undefined') {
  document.documentElement.dataset.brand = brandConfig.brand;
  if (brandConfig.isFord) {
    document.title = 'Ford | Quito Motors — Ruleta Oficial';
  }
}

// Pantalla de abajo del kiosco (botón JUGAR AHORA + impresión): /pantalla/?view=kiosk-button&screen=KIOSK_01
const isKioskButtonView = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('view') === 'kiosk-button';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isKioskButtonView ? <KioskButtonApp /> : <App />}
  </React.StrictMode>
);

