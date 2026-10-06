import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  CheckCircle,
  BarChart3,
  Shield,
  Save,
  RefreshCw,
  Search,
  AlertTriangle,
  LogOut,
  Sliders,
  Check,
  Ticket,
  Percent,
  Clock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (window.location.port && ['5500', '5501', '5502', '5503', '5504'].includes(window.location.port))
    ? `${window.location.protocol}//${window.location.hostname}:5500`
    : window.location.origin;

export default function App() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('prizes'); // 'prizes' | 'leads' | 'redeem' | 'metrics'
  
  const [prizes, setPrizes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Estados para validación de ticket
  const [ticketInput, setTicketInput] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [ticketMsg, setTicketMsg] = useState('');

  useEffect(() => {
    const cachedAuth = localStorage.getItem('vip_admin_auth');
    if (cachedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (cleanPin === 'VIP2026' || cleanPin === 'ADMIN') {
      setIsAuthenticated(true);
      localStorage.setItem('vip_admin_auth', 'true');
      setPin('');
    } else {
      alert('PIN de seguridad incorrecto.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('vip_admin_auth');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resP, resL, resM] = await Promise.all([
        fetch(`${API_URL}/api/admin/prizes`),
        fetch(`${API_URL}/api/leads`),
        fetch(`${API_URL}/api/metrics`)
      ]);
      const jsonP = await resP.json();
      const jsonL = await resL.json();
      const jsonM = await resM.json();

      if (jsonP.success) setPrizes(jsonP.data);
      if (jsonL.success) setLeads(jsonL.data);
      if (jsonM.success) setMetrics(jsonM.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrizeChange = (id, field, value) => {
    setPrizes(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSavePrize = async (prize) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/prizes/${prize.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prize)
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`"${prize.name}" actualizado`);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (e) {
      alert('Error guardando premio');
    }
  };

  // Consultar Ticket
  const handleCheckTicket = async (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;
    setTicketMsg('');
    setTicketData(null);

    try {
      const code = ticketInput.trim().toUpperCase();
      const res = await fetch(`${API_URL}/api/ticket/${code}`);
      const json = await res.json();
      if (json.success) {
        setTicketData(json.data);
      } else {
        setTicketMsg(json.message || 'Ticket no encontrado');
      }
    } catch (err) {
      setTicketMsg('Error al consultar ticket');
    }
  };

  // Canjear Ticket
  const handleRedeemTicket = async (code) => {
    try {
      const res = await fetch(`${API_URL}/api/ticket/${code}/redeem`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        setTicketMsg('¡Ticket marcado como canjeado!');
        handleCheckTicket({ preventDefault: () => {} });
        loadData();
      } else {
        alert(json.message);
      }
    } catch (err) {
      alert('Error canjeando ticket');
    }
  };

  // Filtrado de leads para búsqueda en móvil
  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    return (
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q)) ||
      (l.ticket_code && l.ticket_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen carbon-bg text-white flex flex-col justify-between pb-20 select-none">
      {/* Header Fijo Móvil */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 border-b border-zinc-800 px-4 py-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img
            src="/logotipo.png"
            alt="Marketing VIP"
            className="h-9 w-auto object-contain drop-shadow-[0_0_10px_rgba(154,195,28,0.5)]"
          />
          <div>
            <h1 className="font-racing font-bold text-sm text-white tracking-wider leading-none">
              ADMIN <span className="text-[#9AC31C]">STAND</span>
            </h1>
            <span className="text-[10px] text-zinc-400 font-sans">Marketing VIP Móvil</span>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[#9AC31C] active:scale-95"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Alerta flotante de guardado */}
      {savedMsg && (
        <div className="fixed top-14 left-4 right-4 z-40 bg-[#9AC31C] text-black font-racing font-bold text-xs py-2 px-4 rounded-xl text-center shadow-2xl flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Pantalla de Inicio de Sesión si no está autenticado */}
      {!isAuthenticated ? (
        <main className="flex-1 max-w-sm w-full mx-auto p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#84A816] to-[#9AC31C] flex items-center justify-center shadow-[0_0_30px_rgba(154,195,28,0.8)] mb-4">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h2 className="font-racing font-black text-xl text-white uppercase text-center mb-1">
            Panel de Asesores
          </h2>
          <p className="text-xs text-zinc-400 text-center mb-6">
            Acceso exclusivo para el equipo de Marketing VIP en la feria
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input
              type="password"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa clave de acceso"
              className="w-full text-center py-3.5 px-4 rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-white font-mono text-xl tracking-widest focus:outline-none focus:border-[#9AC31C]"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#84A816] via-[#9AC31C] to-[#84A816] font-racing font-black text-sm text-black rounded-2xl uppercase tracking-wider shadow-lg active:scale-95"
            >
              INGRESAR AL PANEL
            </button>
          </form>
        </main>
      ) : (
        /* Contenido Principal con Pestañas */
        <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
          
          {/* PESTAÑA 1: GESTIÓN DE PREMIOS */}
          {activeTab === 'prizes' && (
            <div className="space-y-3">
              {/* Tip de estrategia de pesos */}
              <div className="bg-zinc-900/90 border border-[#9AC31C]/40 p-3 rounded-2xl flex items-start gap-2.5">
                <Percent className="w-4 h-4 text-[#9AC31C] shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-300">
                  <strong className="text-[#9AC31C]">Estrategia:</strong> Para premios grandes (Cancún, Crucero) pon <strong>Peso 1 o 2</strong> y Límite diario 1. Para recuerdos comunes pon <strong>Peso 300 - 450</strong>.
                </p>
              </div>

              {/* Lista de Tarjetas de Premios */}
              {prizes.map((p) => (
                <div key={p.id} className="brushed-metal p-4 rounded-2xl border border-zinc-800 space-y-3">
                  {/* Encabezado del premio */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: p.color_hex }}
                      />
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handlePrizeChange(p.id, 'name', e.target.value)}
                        className="bg-transparent font-racing font-bold text-sm text-white focus:outline-none border-b border-transparent focus:border-[#9AC31C] w-full"
                      />
                    </div>
                    {/* Probabilidad en tiempo real */}
                    <span className="font-racing text-xs font-black text-[#9AC31C] bg-zinc-900 px-2 py-0.5 rounded-lg border border-[#9AC31C]/30 shrink-0">
                      {p.probability_percentage}%
                    </span>
                  </div>

                  {/* Controles de Peso, Stock y Límite Diario */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Peso */}
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-sans">Peso</span>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={p.weight}
                        onChange={(e) => handlePrizeChange(p.id, 'weight', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center bg-transparent font-mono font-bold text-white text-sm focus:outline-none"
                      />
                    </div>

                    {/* Stock */}
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-sans">Stock</span>
                      <input
                        type="number"
                        min="0"
                        value={p.stock}
                        onChange={(e) => handlePrizeChange(p.id, 'stock', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center bg-transparent font-mono font-bold text-white text-sm focus:outline-none"
                      />
                    </div>

                    {/* Límite Diario */}
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-sans">Tope Día</span>
                      <input
                        type="number"
                        min="0"
                        title="0 = Sin límite"
                        value={p.max_daily_wins}
                        onChange={(e) => handlePrizeChange(p.id, 'max_daily_wins', parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center bg-transparent font-mono font-bold text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Fila de acción y Switch activo */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(p.active)}
                        onChange={(e) => handlePrizeChange(p.id, 'active', e.target.checked ? 1 : 0)}
                        className="w-4 h-4 accent-[#9AC31C] rounded"
                      />
                      <span>{p.active ? 'Activo en ruleta' : 'Inactivo'}</span>
                    </label>

                    <button
                      onClick={() => handleSavePrize(p)}
                      className="px-3 py-1.5 bg-[#9AC31C] text-black font-racing font-bold text-xs rounded-xl shadow active:scale-95 flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PESTAÑA 2: AUDITORÍA DE LEADS */}
          {activeTab === 'leads' && (
            <div className="space-y-3">
              {/* Buscador de leads */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o ticket..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#9AC31C]"
                />
              </div>

              <div className="text-[11px] text-zinc-400 font-mono px-1">
                Mostrando {filteredLeads.length} leads captados
              </div>

              {/* Tarjetas de leads */}
              {filteredLeads.map((l) => (
                <div key={l.id} className="brushed-metal p-3.5 rounded-2xl border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white uppercase">{l.name}</span>
                    <span className="font-mono text-xs font-bold text-[#9AC31C] bg-zinc-900 px-2 py-0.5 rounded border border-[#9AC31C]/30">
                      {l.ticket_code || 'SIN TICKET'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <a
                      href={`https://wa.me/593${l.phone.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-mono underline"
                    >
                      {l.phone}
                    </a>
                    <span className="text-zinc-400">{l.dream_destination}</span>
                  </div>

                  <div className="text-xs text-zinc-300">
                    Premio: <strong className="text-[#9AC31C]">{l.prize_name || 'Pendiente'}</strong>
                  </div>

                  {/* Alerta de Multicuentas / Mismo Dispositivo */}
                  {l.device_leads_count > 1 && (
                    <div className="mt-2 bg-amber-950/80 border border-amber-500/60 p-1.5 rounded-xl text-[10px] text-amber-300 flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>¡Alerta! {l.device_leads_count} leads registrados desde este mismo celular</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PESTAÑA 3: CANJE DE TICKETS EN STAND */}
          {activeTab === 'redeem' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-racing font-bold text-base text-white uppercase">
                  Canjeador de Premios
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ingresa el código del ticket presentado por el visitante
                </p>
              </div>

              <form onSubmit={handleCheckTicket} className="space-y-2">
                <div className="relative">
                  <Ticket className="w-5 h-5 text-[#9AC31C] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                    placeholder="Ej: VIP-ABCD"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-900 border-2 border-zinc-700 text-white font-mono text-base tracking-widest text-center uppercase focus:outline-none focus:border-[#9AC31C]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#9AC31C] font-racing font-black text-xs text-black uppercase rounded-2xl shadow active:scale-95"
                >
                  CONSULTAR TICKET
                </button>
              </form>

              {ticketMsg && (
                <div className="p-3 bg-zinc-900 border border-zinc-700 text-center rounded-2xl text-xs text-zinc-300">
                  {ticketMsg}
                </div>
              )}

              {ticketData && (
                <div className="brushed-metal p-5 rounded-3xl border-2 border-[#9AC31C] space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                    <span className="font-racing text-xs text-zinc-400">TICKET VIP</span>
                    <span className="font-mono text-sm font-bold text-[#9AC31C]">{ticketData.ticket_code}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block">Piloto</span>
                    <p className="text-base font-bold text-white">{ticketData.lead_name}</p>
                    <p className="text-xs text-zinc-400 font-mono">{ticketData.lead_phone}</p>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] text-[#9AC31C] uppercase font-racing block mb-0.5">Premio Ganado</span>
                    <p className="text-sm font-racing font-bold text-white">{ticketData.prize_name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{ticketData.prize_description}</p>
                  </div>

                  {ticketData.redeemed ? (
                    <div className="bg-emerald-950/80 border border-emerald-500 p-3 rounded-2xl text-center text-emerald-300 font-racing font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>PREMIO YA CANJEADO</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRedeemTicket(ticketData.ticket_code)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-racing font-black text-xs text-white uppercase rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>CONFIRMAR ENTREGA DE PREMIO</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 4: MÉTRICAS DEL STAND */}
          {activeTab === 'metrics' && metrics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-400 font-racing uppercase">Leads Captados</span>
                  <p className="text-2xl font-racing font-black text-[#9AC31C] mt-1">{metrics.totalLeads}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-400 font-racing uppercase">Giros Ruleta</span>
                  <p className="text-2xl font-racing font-black text-white mt-1">{metrics.totalSpins}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-400 font-racing uppercase">Canjeados</span>
                  <p className="text-2xl font-racing font-black text-emerald-400 mt-1">{metrics.totalRedeemed}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                  <span className="text-[10px] text-zinc-400 font-racing uppercase">Dispositivos</span>
                  <p className="text-2xl font-racing font-black text-cyan-400 mt-1">{metrics.totalDevices}</p>
                </div>
              </div>

              {/* Top Destinos */}
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <h4 className="font-racing text-xs text-[#9AC31C] uppercase font-bold mb-2">
                  Destinos Más Votados
                </h4>
                <div className="space-y-1.5 text-xs text-zinc-300">
                  {metrics.topDestinations && metrics.topDestinations.map((d, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-zinc-800/60 last:border-none">
                      <span>{d.dream_destination}</span>
                      <span className="font-mono font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Barra de Navegación Inferior (Mobile Bottom Navigation Bar) */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 border-t border-zinc-800 py-2 px-3 flex items-center justify-around backdrop-blur-md">
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'prizes' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Award className="w-5 h-5" />
            <span className="text-[10px] font-racing font-bold uppercase">Premios</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'leads' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-racing font-bold uppercase">Leads</span>
          </button>

          <button
            onClick={() => setActiveTab('redeem')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'redeem' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Ticket className="w-5 h-5" />
            <span className="text-[10px] font-racing font-bold uppercase">Canjear</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'metrics' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-racing font-bold uppercase">Métricas</span>
          </button>
        </nav>
      )}
    </div>
  );
}
