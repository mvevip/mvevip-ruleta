import React from 'react';
import { Download, Smartphone, CheckCircle2, Monitor, Share, PlusSquare } from 'lucide-react';
import { useInstallPrompt } from '../lib/pwa';

/** Instalar el Admin como aplicación (Android, escritorio y iPhone/iPad). */
export default function AppPanel() {
  const { installed, canPrompt, ios, promptInstall } = useInstallPrompt();

  return (
    <div className="max-w-3xl space-y-4">
      {installed ? (
        <div className="notice-ok"><CheckCircle2 className="w-5 h-5 shrink-0" /><span className="text-sm"><strong>Ya estás usando la aplicación instalada.</strong> Se abre con su propio ícono y a pantalla completa.</span></div>
      ) : (
        <section className="card card-pad space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-12 h-12 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center shrink-0"><Download className="w-6 h-6" /></span>
            <div>
              <h3 className="font-bold text-ink text-lg leading-tight">Instala el panel como aplicación</h3>
              <p className="text-sm text-ink-muted mt-0.5">Tendrás un ícono propio, se abre más rápido, a pantalla completa, y recibes los avisos de cada lead nuevo.</p>
            </div>
          </div>
          {canPrompt && <button type="button" onClick={promptInstall} className="btn-primary py-3 px-6 text-base"><Download className="w-5 h-5" /> Instalar ahora</button>}
          {!canPrompt && !ios && (
            <div className="notice-info text-sm"><Monitor className="w-5 h-5 shrink-0" /><span>Si no ves el botón, abre el menú del navegador (⋮) y elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla de inicio"</strong>. En Chrome y Edge también aparece un ícono de instalación en la barra de direcciones.</span></div>
          )}
        </section>
      )}

      <section className="card card-pad space-y-3">
        <h3 className="panel-title flex items-center gap-2"><Smartphone className="w-4 h-4" /> iPhone y iPad (Safari)</h3>
        <ol className="space-y-3 text-sm text-ink-2">
          <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">1</span><span>Abre este panel en <strong>Safari</strong> y toca el botón <Share className="inline w-4 h-4 mx-0.5 -mt-0.5" /> <strong>Compartir</strong>.</span></li>
          <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">2</span><span>Elige <PlusSquare className="inline w-4 h-4 mx-0.5 -mt-0.5" /> <strong>Agregar a inicio</strong> y confirma.</span></li>
          <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">3</span><span>Abre <strong>VIP Admin</strong> desde el ícono nuevo y activa las notificaciones en <strong>Ajustes → Notificaciones</strong> (requiere iOS 16.4 o superior).</span></li>
        </ol>
      </section>

      <section className="card card-pad space-y-2 text-sm text-ink-2">
        <h3 className="panel-title">Android y escritorio</h3>
        <p className="leading-relaxed">En Chrome o Edge toca <strong>Instalar</strong> (aquí arriba o en la barra de direcciones). La aplicación queda en tu menú de inicio o pantalla de inicio, y puedes fijarla en la barra de tareas.</p>
      </section>
    </div>
  );
}
