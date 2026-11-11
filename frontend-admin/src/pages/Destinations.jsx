import React, { useCallback, useEffect, useState } from 'react';
import { Compass, Plus, Star, Pencil, Trash2, Check, X, Info } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, EmptyState, Switch } from '../components/ui';

/** Destinos soñados que la gente puede elegir al registrarse en los stands (Autos y ferias con pantalla). */
export default function Destinations() {
  const { apiFetch, toast } = useAdmin();
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [asDefault, setAsDefault] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/destinations');
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (_) { /* sesión */ }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, okMsg) => {
    try {
      const res = await apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (json.success) { toast(okMsg); await load(); return true; }
      toast(json.message || 'No se pudo completar la acción', 'error');
    } catch (_) { /* sesión */ }
    return false;
  };

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast('Escribe el nombre del destino', 'error'); return; }
    if (await call('/api/admin/destinations', 'POST', { name: name.trim(), is_default: asDefault, active: true }, `Destino "${name.trim()}" agregado`)) { setName(''); setAsDefault(false); }
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    if (await call(`/api/admin/destinations/${id}`, 'PUT', { name: editName.trim() }, 'Destino actualizado')) setEditId(null);
  };

  const remove = async (d) => {
    if (!window.confirm(`¿Eliminar el destino "${d.name}"?`)) return;
    await call(`/api/admin/destinations/${d.id}`, 'DELETE', null, `"${d.name}" eliminado`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 anim-fade-in">
      <PageHeader title="Destinos soñados" icon={Compass} subtitle="Opciones que ve la gente al registrarse en la pantalla gigante." />

      <div className="notice-info"><Info className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">El destino marcado con ⭐ es el que se asigna cuando la persona no elige ninguno. Los destinos inactivos dejan de mostrarse en el formulario.</span></div>

      <form onSubmit={create} className="card card-pad space-y-3">
        <h2 className="panel-title flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar destino</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: 🌴 Cancún" className="input flex-1" aria-label="Nombre del destino" />
          <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Agregar</button>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-2 cursor-pointer"><input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} className="w-4 h-4 accent-[#9AC31C]" /> Usar como destino por defecto</label>
      </form>

      {items === null ? (
        <div className="card divide-y divide-line">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><div className="skeleton h-5 w-1/2" /></div>)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay destinos" text="Agrega el primero con el formulario de arriba." icon={Compass} />
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((d) => (
            <li key={d.id} className="p-3.5 sm:p-4 flex items-center gap-3">
              <button type="button" onClick={() => !d.is_default && call(`/api/admin/destinations/${d.id}`, 'PUT', { is_default: true }, `"${d.name}" es ahora el destino por defecto`)} className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${d.is_default ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`} title={d.is_default ? 'Destino por defecto' : 'Marcar como destino por defecto'} aria-label="Destino por defecto">
                <Star className={`w-[18px] h-[18px] ${d.is_default ? 'fill-amber-400' : ''}`} />
              </button>

              <div className="min-w-0 flex-1">
                {editId === d.id ? (
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(d.id); if (e.key === 'Escape') setEditId(null); }} className="input py-1.5" aria-label="Nuevo nombre" />
                ) : (
                  <div className={`font-bold truncate ${d.active ? 'text-ink' : 'text-ink-muted line-through'}`}>{d.name}</div>
                )}
                {d.is_default && editId !== d.id && <span className="badge-amber mt-0.5">Por defecto</span>}
              </div>

              {editId === d.id ? (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => saveEdit(d.id)} className="btn-icon w-9 h-9 text-emerald-600" aria-label="Guardar"><Check className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setEditId(null)} className="btn-icon w-9 h-9" aria-label="Cancelar"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Switch checked={Boolean(d.active)} onChange={() => call(`/api/admin/destinations/${d.id}`, 'PUT', { active: !d.active }, `"${d.name}" ${d.active ? 'desactivado' : 'activado'}`)} label={`Activar ${d.name}`} />
                  <button type="button" onClick={() => { setEditId(d.id); setEditName(d.name); }} className="btn-icon w-9 h-9" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(d)} className="btn-icon w-9 h-9 text-red-600" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
