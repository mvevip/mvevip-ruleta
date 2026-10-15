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
  Clock,
  Compass,
  Trash2,
  Edit2,
  Plus,
  Star,
  Tv,
  FlaskConical
} from 'lucide-react';
import DisplaysManager from './components/DisplaysManager';
import TestUsersManager from './components/TestUsersManager';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.')
);

const API_URL = isLocal
  ? (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5500`)
  : (typeof window !== 'undefined' ? window.location.origin : '');

export default function App() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('prizes'); // 'prizes' | 'leads' | 'destinations' | 'displays' | 'redeem' | 'metrics'
  const [leadsSubTab, setLeadsSubTab] = useState('captured'); // 'captured' | 'test_users'
  
  const [prizes, setPrizes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [newDestName, setNewDestName] = useState('');
  const [newDestDefault, setNewDestDefault] = useState(false);
  const [editingDestId, setEditingDestId] = useState(null);
  const [editingDestName, setEditingDestName] = useState('');
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

  const getAdminHeaders = () => {
    const storedPin = localStorage.getItem('vip_admin_pin') || 'VIP2026';
    return {
      'Content-Type': 'application/json',
      'x-admin-pin': storedPin
    };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (cleanPin === 'VIP2026' || cleanPin === 'ADMIN') {
      setIsAuthenticated(true);
      localStorage.setItem('vip_admin_auth', 'true');
      localStorage.setItem('vip_admin_pin', cleanPin);
      setPin('');
    } else {
      alert('PIN de seguridad incorrecto.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('vip_admin_auth');
    localStorage.removeItem('vip_admin_pin');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const [resP, resL, resM, resD] = await Promise.all([
        fetch(`${API_URL}/api/admin/prizes`, { headers }),
        fetch(`${API_URL}/api/leads`, { headers }),
        fetch(`${API_URL}/api/metrics`, { headers }),
        fetch(`${API_URL}/api/admin/destinations`, { headers })
      ]);

      if (resP.status === 401 || resL.status === 401) {
        handleLogout();
        alert('Sesión expirada o PIN inválido. Por favor ingresa nuevamente.');
        return;
      }

      const jsonP = await resP.json();
      const jsonL = await resL.json();
      const jsonM = await resM.json();
      if (resD.ok) {
        const jsonD = await resD.json();
        if (jsonD.success) setDestinations(jsonD.data);
      }

      if (jsonP.success) setPrizes(jsonP.data);
      if (jsonL.success) setLeads(jsonL.data);
      if (jsonM.success) setMetrics(jsonM.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para Gestión de Destinos
  const handleCreateDestination = async () => {
    if (!newDestName.trim()) {
      alert('Ingresa un nombre para el destino');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/destinations`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          name: newDestName.trim(),
          is_default: newDestDefault,
          active: true
        })
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`Destino "${newDestName}" agregado`);
        setNewDestName('');
        setNewDestDefault(false);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      } else {
        alert(json.message || 'Error al agregar destino');
      }
    } catch (e) {
      alert('Error de conexión al agregar destino');
    }
  };

  const handleToggleDestinationDefault = async (dest) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/destinations/${dest.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ is_default: true })
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`"${dest.name}" fijado como por defecto`);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (e) {
      alert('Error al fijar destino por defecto');
    }
  };

  const handleToggleDestinationActive = async (dest) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/destinations/${dest.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ active: !dest.active })
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`"${dest.name}" ${!dest.active ? 'activado' : 'desactivado'}`);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (e) {
      alert('Error al cambiar estado del destino');
    }
  };

  const handleSaveEditDestination = async (id) => {
    if (!editingDestName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/destinations/${id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ name: editingDestName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg('Destino actualizado');
        setEditingDestId(null);
        setEditingDestName('');
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (e) {
      alert('Error al actualizar destino');
    }
  };

  const handleDeleteDestination = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el destino "${name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/destinations/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`"${name}" eliminado`);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      }
    } catch (e) {
      alert('Error al eliminar destino');
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
        headers: getAdminHeaders(),
        body: JSON.stringify(prize)
      });
      const json = await res.json();
      if (json.success) {
        setSavedMsg(`"${prize.name}" actualizado`);
        loadData();
        setTimeout(() => setSavedMsg(''), 2500);
      } else {
        alert(json.message || 'Error guardando premio');
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
      const res = await fetch(`${API_URL}/api/ticket/${code}`, {
        headers: getAdminHeaders()
      });
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
        method: 'POST',
        headers: getAdminHeaders()
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
        <main className={`flex-1 w-full mx-auto p-4 space-y-4 pb-24 ${activeTab === 'displays' ? 'max-w-2xl' : 'max-w-md'}`}>
          
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

          {/* PESTAÑA 2: AUDITORÍA DE LEADS & USUARIOS DE PRUEBA */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {/* Selector de Sub-Pestaña: Leads Reales vs Usuarios Demo */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setLeadsSubTab('captured')}
                  className={`flex-1 py-2 px-3 rounded-xl font-racing font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    leadsSubTab === 'captured'
                      ? 'bg-[#9AC31C] text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Leads ({leads.filter(l => !l.is_test).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadsSubTab('test_users')}
                  className={`flex-1 py-2 px-3 rounded-xl font-racing font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    leadsSubTab === 'test_users'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5 text-purple-300" />
                  <span>Usuarios Demo</span>
                </button>
              </div>

              {leadsSubTab === 'test_users' ? (
                <TestUsersManager
                  apiUrl={API_URL}
                  getAdminHeaders={getAdminHeaders}
                  onNotification={(msg) => {
                    setSavedMsg(msg);
                    setTimeout(() => setSavedMsg(''), 3000);
                  }}
                />
              ) : (
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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white uppercase">{l.name}</span>
                          {l.is_test ? (
                            <span className="text-[9px] font-mono text-purple-300 bg-purple-950/80 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold">
                              DEMO
                            </span>
                          ) : null}
                        </div>
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
                      {l.device_leads_count > 1 && !l.is_test && (
                        <div className="mt-2 bg-amber-950/80 border border-amber-500/60 p-1.5 rounded-xl text-[10px] text-amber-300 flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>¡Alerta! {l.device_leads_count} leads registrados desde este mismo celular</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

          {/* PESTAÑA 5: GESTIÓN DE DESTINOS SOÑADOS */}
          {activeTab === 'destinations' && (
            <div className="space-y-4">
              {/* Formulario para Crear Nuevo Destino */}
              <div className="brushed-metal p-4 rounded-2xl border border-zinc-800 space-y-3">
                <h3 className="font-racing font-bold text-xs text-[#9AC31C] uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#9AC31C]" />
                  <span>Agregar Nuevo Destino</span>
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDestName}
                    onChange={(e) => setNewDestName(e.target.value)}
                    placeholder="Ej: 🗼 París o 🌴 Galápagos"
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#9AC31C]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateDestination}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#84A816] to-[#9AC31C] text-black font-racing font-bold text-xs uppercase shadow-md active:scale-95 cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={newDestDefault}
                    onChange={(e) => setNewDestDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-[#9AC31C] accent-[#9AC31C] cursor-pointer"
                  />
                  <span>Establecer como destino por defecto</span>
                </label>
              </div>

              {/* Lista de Destinos Configurados */}
              <div className="space-y-2">
                <div className="px-1 flex items-center justify-between">
                  <span className="font-racing text-xs text-zinc-400 uppercase font-bold">
                    Destinos ({destinations.length})
                  </span>
                  <span className="text-[10px] text-zinc-500">Toca ★ para definir por defecto</span>
                </div>

                {destinations.map((d) => (
                  <div
                    key={d.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      d.is_default
                        ? 'bg-zinc-900/90 border-[#9AC31C] shadow-[0_0_12px_rgba(154,195,28,0.2)]'
                        : d.active
                        ? 'bg-zinc-900/60 border-zinc-800'
                        : 'bg-zinc-950 border-zinc-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Botón Destino Por Defecto */}
                      <button
                        type="button"
                        onClick={() => handleToggleDestinationDefault(d)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          d.is_default
                            ? 'bg-[#9AC31C] text-black border-[#9AC31C]'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-yellow-400'
                        }`}
                        title={d.is_default ? 'Destino por defecto actual' : 'Marcar como por defecto'}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {editingDestId === d.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingDestName}
                            onChange={(e) => setEditingDestName(e.target.value)}
                            className="flex-1 py-1 px-2 rounded-lg bg-zinc-800 border border-[#9AC31C] text-white text-xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditDestination(d.id)}
                            className="p-1.5 rounded-lg bg-[#9AC31C] text-black text-xs font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {d.name}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {d.is_default ? '★ Por defecto' : d.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Toggle Activo/Inactivo */}
                      <button
                        type="button"
                        onClick={() => handleToggleDestinationActive(d)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          d.active
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        }`}
                      >
                        {d.active ? 'On' : 'Off'}
                      </button>

                      {/* Editar Nombre */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDestId(d.id);
                          setEditingDestName(d.name);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                        title="Editar nombre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDeleteDestination(d.id, d.name)}
                        className="p-1.5 rounded-lg bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-950 cursor-pointer"
                        title="Eliminar destino"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PESTAÑA 4: PANTALLAS & CARTELERÍA DIGITAL */}
          {activeTab === 'displays' && (
            <DisplaysManager
              apiUrl={API_URL}
              getAdminHeaders={getAdminHeaders}
              onNotification={(msg) => {
                setSavedMsg(msg);
                setTimeout(() => setSavedMsg(''), 3000);
              }}
            />
          )}

        </main>
      )}

      {/* Barra de Navegación Inferior (Mobile Bottom Navigation Bar) */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 border-t border-zinc-800 py-2 px-1 flex items-center justify-around backdrop-blur-md">
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'prizes' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Award className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Premios</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'leads' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Leads</span>
          </button>

          <button
            onClick={() => setActiveTab('destinations')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'destinations' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Destinos</span>
          </button>

          <button
            onClick={() => setActiveTab('displays')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'displays' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Pantallas</span>
          </button>

          <button
            onClick={() => setActiveTab('redeem')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'redeem' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Canjear</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
              activeTab === 'metrics' ? 'text-[#9AC31C]' : 'text-zinc-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[9px] font-racing font-bold uppercase">Métricas</span>
          </button>
        </nav>
      )}
    </div>
  );
}
