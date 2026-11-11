import React, { useState } from 'react';
import { Shield, Lock, Loader2, Smartphone, Share, PlusSquare } from 'lucide-react';
import { useAdmin } from './context/AdminContext';
import { Toasts, Modal } from './components/ui';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import BottomNav from './components/layout/BottomNav';
import Overview from './pages/Overview';
import Leads from './pages/Leads';
import Prizes from './pages/Prizes';
import Redeem from './pages/Redeem';
import Destinations from './pages/Destinations';
import Metrics from './pages/Metrics';
import Displays from './pages/Displays';
import Settings from './pages/Settings';

const PAGE_VIEWS = {
  resumen: Overview,
  leads: Leads,
  premios: Prizes,
  canje: Redeem,
  destinos: Destinations,
  metricas: Metrics,
  pantallas: Displays,
  ajustes: Settings
};

function Login() {
  const { login } = useAdmin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const result = await login(pin);
    if (!result.ok) { setError(result.message); setPin(''); }
    setBusy(false);
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <section className="hidden lg:flex flex-col justify-between bg-navy text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-[28rem] h-[28rem] rounded-full bg-sky-400/10 blur-3xl" />
        <img src={`${import.meta.env.BASE_URL}logotipo.png`} alt="Marketing VIP" className="h-16 w-auto object-contain self-start rounded-2xl bg-white p-2 relative" />
        <div className="relative space-y-4 max-w-md">
          <h1 className="font-racing font-black text-4xl leading-tight uppercase">Ferias bajo control, en tiempo real.</h1>
          <p className="text-white/75 leading-relaxed">Leads, premios, canje y pantallas de Riobamba, Ambato y más, con un aviso al instante por cada registro nuevo.</p>
        </div>
        <p className="relative text-xs text-white/50">Marketing VIP · Especialistas en sueños</p>
      </section>

      <section className="flex items-center justify-center p-6 pt-safe">
        <form onSubmit={submit} className="w-full max-w-sm card card-pad !p-7 space-y-5 anim-slide-up">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-brand text-ink flex items-center justify-center shadow-card"><Shield className="w-7 h-7" /></span>
            <div>
              <h2 className="font-racing font-black text-xl uppercase text-navy">Panel de administración</h2>
              <p className="text-sm text-ink-muted mt-1">Acceso exclusivo para el equipo de Marketing VIP</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="pin">Clave de acceso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pin" type="password" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck="false" autoFocus autoComplete="current-password"
                value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Escribe tu clave"
                className="input pl-10 text-center font-mono tracking-widest" aria-invalid={Boolean(error)} aria-describedby={error ? 'pin-error' : undefined}
              />
            </div>
            {error && <p id="pin-error" className="text-sm font-semibold text-red-600 mt-2" role="alert">{error}</p>}
          </div>
          <button type="submit" disabled={busy || !pin.trim()} className="btn-primary w-full py-3 text-base">
            {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando…</> : 'Ingresar al panel'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const { isAuthenticated, route } = useAdmin();
  const [installHelp, setInstallHelp] = useState(false);
  const View = PAGE_VIEWS[route.page] || Overview;

  if (!isAuthenticated) return (<><Login /><Toasts /></>);

  return (
    <div className="min-h-screen bg-canvas" style={{ minHeight: '100dvh' }}>
      <Sidebar onInstallHelp={() => setInstallHelp(true)} />
      <div className="lg:pl-[272px] min-h-screen flex flex-col">
        <Topbar />
        <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-10">
          <View key={route.page} />
        </main>
      </div>
      <BottomNav onInstallHelp={() => setInstallHelp(true)} />
      <Toasts />

      {installHelp && (
        <Modal title="Instalar en iPhone o iPad" onClose={() => setInstallHelp(false)}>
          <ol className="space-y-3 text-sm text-ink-2">
            <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">1</span><span>En Safari, toca el botón <Share className="inline w-4 h-4 mx-0.5 -mt-0.5" /> <strong>Compartir</strong>.</span></li>
            <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">2</span><span>Elige <PlusSquare className="inline w-4 h-4 mx-0.5 -mt-0.5" /> <strong>Agregar a inicio</strong> y confirma.</span></li>
            <li className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0"><Smartphone className="w-3.5 h-3.5" /></span><span>Abre <strong>VIP Admin</strong> desde el ícono nuevo.</span></li>
          </ol>
        </Modal>
      )}
    </div>
  );
}
