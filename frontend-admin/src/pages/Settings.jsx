import React from 'react';
import { Settings as SettingsIcon, MapPin, Bell, SlidersHorizontal, FlaskConical, Download } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader } from '../components/ui';
import EventSettingsPanel from '../components/EventSettingsPanel';
import ChannelsPanel from '../components/ChannelsPanel';
import PushPanel from '../components/PushPanel';
import AppPanel from '../components/AppPanel';
import TestUsersManager from '../components/TestUsersManager';
import { API_URL } from '../context/AdminContext';

const SECTIONS = [
  { key: 'feria', label: 'Datos de la feria', icon: MapPin, sub: 'Lugar, fechas, stand, cierre y enlaces de Riobamba y Ambato.' },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell, sub: 'Un aviso por cada lead nuevo, en este dispositivo.' },
  { key: 'canales', label: 'Canales de acceso', icon: SlidersHorizontal, sub: 'Qué accesos están abiertos y a dónde va quien entra sin parámetros.' },
  { key: 'demo', label: 'Usuarios demo', icon: FlaskConical, sub: 'Personas de prueba que juegan sin gastar stock.' },
  { key: 'app', label: 'Instalar la app', icon: Download, sub: 'Ícono propio, acceso rápido y avisos en el celular.' }
];

export default function Settings() {
  const { route, navigate, getAdminHeaders, toast } = useAdmin();
  const current = SECTIONS.find((s) => s.key === (route.params && route.params.seccion)) || SECTIONS[0];

  return (
    <div className="space-y-5 anim-fade-in">
      <PageHeader title="Ajustes" icon={SettingsIcon} subtitle={current.sub} />

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" role="tablist" aria-label="Secciones de ajustes">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.key === current.key;
          return (
            <button key={s.key} type="button" role="tab" aria-selected={active} onClick={() => navigate('ajustes', { seccion: s.key })} className={`chip shrink-0 ${active ? 'chip-active' : ''}`}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {current.key === 'feria' && <EventSettingsPanel />}
      {current.key === 'notificaciones' && <PushPanel />}
      {current.key === 'canales' && <ChannelsPanel />}
      {current.key === 'demo' && (
        <div className="max-w-3xl">
          <TestUsersManager apiUrl={API_URL} getAdminHeaders={getAdminHeaders} onNotification={(msg) => toast(msg)} />
        </div>
      )}
      {current.key === 'app' && <AppPanel />}
    </div>
  );
}
