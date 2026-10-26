import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import KioskApp from './KioskApp';
import './index.css';
import './brand-ford.css';
import { applyMobileBrandAttribute, detectKioskView } from './brand';
import { resolveChannelRedirect } from './channelGate';

// Primero se resuelve el canal (por defecto / deshabilitado); si hay redirección no se monta la app
resolveChannelRedirect().then((redirected) => {
  if (redirected) return;
  applyMobileBrandAttribute();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      {detectKioskView() ? <KioskApp /> : <App />}
    </React.StrictMode>
  );
});

