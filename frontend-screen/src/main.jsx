import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

