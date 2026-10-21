import React, { useState, useEffect } from 'react';
import { Settings, Shield, X, Save, Plus, RefreshCw, AlertTriangle, Users, Award, Percent } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (window.location.port && ['5500', '5501', '5502', '5503', '5504'].includes(window.location.port))
    ? `${window.location.protocol}//${window.location.hostname}:5500`
    : window.location.origin;

export default function AdminModal({ isOpen, onClose, onPrizesUpdated }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('prizes'); // 'prizes' | 'leads'
  const [prizes, setPrizes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [editingPrize, setEditingPrize] = useState(null);

  // Cargar datos administrativos al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (cleanPin === 'VIP2026') {
      setIsAuthenticated(true);
      setPin('');
    } else {
      alert('PIN de seguridad incorrecto');
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resPrizes, resLeads, resMetrics] = await Promise.all([
        fetch(`${API_URL}/api/admin/prizes`),
        fetch(`${API_URL}/api/leads`),
        fetch(`${API_URL}/api/metrics`)
      ]);

      const jsonP = await resPrizes.json();
      const jsonL = await resLeads.json();
      const jsonM = await resMetrics.json();

      if (jsonP.success) setPrizes(jsonP.data);
      if (jsonL.success) setLeads(jsonL.data);
      if (jsonM.success) setMetrics(jsonM.data);
    } catch (err) {
      console.error('Error cargando datos de admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrize = async (prize) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/prizes/${prize.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prize)
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(`Premio "${prize.name}" actualizado`);
        fetchAdminData();
        if (onPrizesUpdated) onPrizesUpdated();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      alert('Error guardando cambios');
    }
  };

  const handleFieldChange = (id, field, value) => {
    setPrizes(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border-2 border-amber-500 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="font-racing font-bold text-lg text-white">
              PANEL DE CONTROL • STAND FERIA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pantalla de Autenticación con PIN */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="p-8 flex flex-col items-center justify-center max-w-xs mx-auto">
            <Shield className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="font-racing text-lg font-bold text-white mb-1">Acceso Administrativo</h3>
            <p className="text-xs text-zinc-400 text-center mb-4">Ingresa el PIN de seguridad del stand</p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa clave de acceso"
              className="w-full text-center py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono tracking-widest text-lg mb-4 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 font-racing font-bold text-sm rounded-xl text-white shadow-lg"
            >
              INGRESAR AL PANEL
            </button>
          </form>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs & Acciones */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('prizes')}
                  className={`px-4 py-1.5 rounded-xl font-racing text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'prizes'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Control de Premios & Probabilidades</span>
                </button>
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`px-4 py-1.5 rounded-xl font-racing text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'leads'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Auditoría de Leads & Dispositivos</span>
                </button>
              </div>

              <button
                onClick={fetchAdminData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs"
                title="Recargar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {statusMsg && (
              <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs px-4 py-1.5 text-center">
                {statusMsg}
              </div>
            )}

            {/* Contenido Pestaña 1: Control de Premios */}
            {activeTab === 'prizes' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Banner de Estrategia */}
                <div className="bg-zinc-900/90 border border-amber-500/40 p-3 rounded-2xl flex items-start gap-3">
                  <Percent className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-300">
                    <strong className="text-amber-400 uppercase font-racing">Estrategia de Probabilidad Ponderada:</strong>
                    <p className="mt-0.5">
                      Para <strong>premios grandes</strong> (Cancún, Cruceros, Vuelo 2x1) asigna un <strong>Peso bajo (1 a 5)</strong> y <strong>Límite Diario (1)</strong>.
                      Para <strong>premios comunes</strong> (Gorras, Descuentos) usa <strong>Peso alto (300 a 500)</strong>. Si pones peso <strong>0</strong>, el premio aparece en la ruleta pero nunca saldrá.
                    </p>
                  </div>
                </div>

                {/* Tabla de Premios */}
                <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900 font-racing text-zinc-400 uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Premio</th>
                        <th className="p-3">Color</th>
                        <th className="p-3 text-center">Peso</th>
                        <th className="p-3 text-center">Probabilidad</th>
                        <th className="p-3 text-center">Stock</th>
                        <th className="p-3 text-center">Tope Diario</th>
                        <th className="p-3 text-center">Activo</th>
                        <th className="p-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-sans">
                      {prizes.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="p-3 font-semibold text-white">
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => handleFieldChange(p.id, 'name', e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-white text-xs w-44 font-semibold"
                            />
                            <div className="text-[10px] text-zinc-500 mt-0.5">{p.category}</div>
                          </td>
                          <td className="p-3">
                            <input
                              type="color"
                              value={p.color_hex}
                              onChange={(e) => handleFieldChange(p.id, 'color_hex', e.target.value)}
                              className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={p.weight}
                              onChange={(e) => handleFieldChange(p.id, 'weight', parseInt(e.target.value, 10) || 0)}
                              className="w-16 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-center text-white font-mono"
                            />
                          </td>
                          <td className="p-3 text-center font-racing font-bold text-amber-400">
                            {p.probability_percentage}%
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={p.stock}
                              onChange={(e) => handleFieldChange(p.id, 'stock', parseInt(e.target.value, 10) || 0)}
                              className="w-16 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-center text-white font-mono"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              title="0 = Sin límite diario"
                              value={p.max_daily_wins}
                              onChange={(e) => handleFieldChange(p.id, 'max_daily_wins', parseInt(e.target.value, 10) || 0)}
                              className="w-16 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-center text-white font-mono"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(p.active)}
                              onChange={(e) => handleFieldChange(p.id, 'active', e.target.checked ? 1 : 0)}
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleUpdatePrize(p)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-racing text-[11px] font-bold inline-flex items-center gap-1 shadow"
                            >
                              <Save className="w-3.5 h-3.5" /> Guardar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: Auditoría de Leads y Dispositivos */}
            {activeTab === 'leads' && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Métricas Rápidas */}
                {metrics && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-racing">Total Leads</span>
                      <p className="text-xl font-racing font-bold text-white">{metrics.totalLeads}</p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-racing">Giros Totales</span>
                      <p className="text-xl font-racing font-bold text-amber-400">{metrics.totalSpins}</p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-racing">Premios Canjeados</span>
                      <p className="text-xl font-racing font-bold text-emerald-400">{metrics.totalRedeemed}</p>
                    </div>
                    <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-racing">Dispositivos Únicos</span>
                      <p className="text-xl font-racing font-bold text-cyan-400">{metrics.totalDevices}</p>
                    </div>
                  </div>
                )}

                {/* Tabla de Leads */}
                <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900 font-racing text-zinc-400 uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Celular</th>
                        <th className="p-3">Destino</th>
                        <th className="p-3">Premio</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Dispositivo / Auditoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-sans">
                      {leads.map((l) => (
                        <tr key={l.id} className="hover:bg-zinc-900/50">
                          <td className="p-3 font-semibold text-white">{l.name}</td>
                          <td className="p-3 font-mono text-emerald-400">{l.phone}</td>
                          <td className="p-3 text-amber-300">{l.dream_destination}</td>
                          <td className="p-3">{l.prize_name || 'Sin premio'}</td>
                          <td className="p-3 font-mono font-bold text-cyan-400">{l.ticket_code || '-'}</td>
                          <td className="p-3">
                            {l.device_leads_count > 1 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-950 border border-amber-500/70 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                {l.device_leads_count} leads desde este celular
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Dispositivo único ({l.device_id ? l.device_id.slice(0, 10) : 'OK'})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
