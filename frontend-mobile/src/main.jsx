import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './brand-ford.css';
import { applyMobileBrandAttribute } from './brand';
import { resolveChannelRedirect } from './channelGate';

// Primero se resuelve el canal (por defecto / deshabilitado); si hay redirección no se monta la app
resolveChannelRedirect().then((redirected) => {
  if (redirected) return;
  applyMobileBrandAttribute();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

